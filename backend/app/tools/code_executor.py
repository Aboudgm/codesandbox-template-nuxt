"""
Safe code execution sandbox.
Runs code in a subprocess with timeout, capturing stdout/stderr.
Supports Python, JavaScript (Node.js), and Bash.
"""
from __future__ import annotations

import asyncio
import logging
import re
import shutil
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Patterns considered dangerous – blocked before execution
_DANGEROUS_PATTERNS: list[re.Pattern] = [
    re.compile(r"rm\s+-rf\s+/", re.IGNORECASE),
    re.compile(r":\s*\(\)\s*\{.*\}", re.DOTALL),   # fork bomb
    re.compile(r"mkfs\.", re.IGNORECASE),
    re.compile(r"dd\s+if=", re.IGNORECASE),
    re.compile(r"shutdown\b", re.IGNORECASE),
    re.compile(r"reboot\b", re.IGNORECASE),
    re.compile(r">/dev/sd", re.IGNORECASE),
    re.compile(r"shred\b", re.IGNORECASE),
]

_LANGUAGE_CONFIG: dict[str, dict] = {
    "python": {
        "extension": ".py",
        "command": ["python3", "{file}"],
        "available": lambda: shutil.which("python3") is not None,
    },
    "javascript": {
        "extension": ".js",
        "command": ["node", "{file}"],
        "available": lambda: shutil.which("node") is not None,
    },
    "bash": {
        "extension": ".sh",
        "command": ["bash", "{file}"],
        "available": lambda: shutil.which("bash") is not None,
    },
}


class CodeExecutorTool:
    """Execute code snippets safely in a subprocess sandbox."""

    def __init__(self, timeout: int = 30, max_output_size: int = 65536):
        self.timeout = timeout
        self.max_output_size = max_output_size

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def execute(
        self,
        code: str,
        language: str = "python",
    ) -> dict:
        """
        Execute *code* in the specified *language*.

        Returns:
            {
                "output": str,
                "error": str,
                "exit_code": int,
                "language": str,
                "sanitized": bool,   # True if dangerous patterns were stripped
            }
        """
        language = language.lower().strip()

        if language not in _LANGUAGE_CONFIG:
            return {
                "output": "",
                "error": f"Unsupported language: {language!r}. Supported: {list(_LANGUAGE_CONFIG)}",
                "exit_code": -1,
                "language": language,
                "sanitized": False,
            }

        cfg = _LANGUAGE_CONFIG[language]
        if not cfg["available"]():
            return {
                "output": "",
                "error": f"Runtime not found for language: {language}",
                "exit_code": -1,
                "language": language,
                "sanitized": False,
            }

        code, sanitized = self._sanitize(code)

        # Write code to a temp file and execute it
        suffix = cfg["extension"]
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=suffix, delete=False, prefix="sandbox_"
        ) as tmp:
            tmp.write(code)
            tmp_path = tmp.name

        cmd = [part.replace("{file}", tmp_path) for part in cfg["command"]]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=self.timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.communicate()
                return {
                    "output": "",
                    "error": f"Execution timed out after {self.timeout}s",
                    "exit_code": -1,
                    "language": language,
                    "sanitized": sanitized,
                }

            output = stdout_bytes.decode("utf-8", errors="replace")[: self.max_output_size]
            error = stderr_bytes.decode("utf-8", errors="replace")[: self.max_output_size]
            exit_code = proc.returncode or 0

            return {
                "output": output,
                "error": error,
                "exit_code": exit_code,
                "language": language,
                "sanitized": sanitized,
            }

        except Exception as exc:
            logger.error("code execution failed: %s", exc)
            return {
                "output": "",
                "error": str(exc),
                "exit_code": -1,
                "language": language,
                "sanitized": sanitized,
            }
        finally:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _sanitize(self, code: str) -> tuple[str, bool]:
        """
        Check for dangerous patterns. If found, replace the matched
        portion with a safe no-op comment so execution still runs but
        the dangerous call is neutralised.

        Returns (sanitized_code, was_sanitized).
        """
        modified = False
        for pattern in _DANGEROUS_PATTERNS:
            if pattern.search(code):
                code = pattern.sub("# [BLOCKED: dangerous operation]", code)
                modified = True
                logger.warning("Blocked dangerous pattern: %s", pattern.pattern)
        return code, modified
