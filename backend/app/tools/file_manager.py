"""
File manager tool – provides safe CRUD operations inside a sandboxed workspace.
All paths are resolved relative to /data/workspace/ (or a configured root).
"""
from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Optional

import aiofiles

logger = logging.getLogger(__name__)

_DEFAULT_WORKSPACE = "/data/workspace"


class FileManagerTool:
    """Async file operations scoped to a workspace directory."""

    def __init__(self, workspace: str = _DEFAULT_WORKSPACE):
        self.workspace = Path(workspace).resolve()
        self.workspace.mkdir(parents=True, exist_ok=True)
        # Ensure reports sub-directory exists
        (self.workspace / "reports").mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _safe_path(self, relative: str) -> Path:
        """
        Resolve *relative* against workspace root and ensure it doesn't
        escape via path traversal (e.g. ../../etc/passwd).
        """
        resolved = (self.workspace / relative).resolve()
        if not str(resolved).startswith(str(self.workspace)):
            raise ValueError(
                f"Path traversal detected: {relative!r} resolves outside workspace"
            )
        return resolved

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def create_file(self, path: str, content: str) -> bool:
        """
        Write *content* to *path* (relative to workspace).
        Creates parent directories as needed.
        Returns True on success.
        """
        try:
            target = self._safe_path(path)
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: target.parent.mkdir(parents=True, exist_ok=True)
            )
            async with aiofiles.open(target, mode="w", encoding="utf-8") as f:
                await f.write(content)
            logger.debug("Created file: %s", target)
            return True
        except Exception as exc:
            logger.error("create_file(%r) failed: %s", path, exc)
            return False

    async def read_file(self, path: str) -> str:
        """
        Read and return the text content of a file.
        Raises FileNotFoundError if the file doesn't exist.
        """
        target = self._safe_path(path)
        if not target.exists():
            raise FileNotFoundError(f"File not found: {path!r}")
        async with aiofiles.open(target, mode="r", encoding="utf-8", errors="replace") as f:
            return await f.read()

    async def list_files(self, directory: str = "") -> list[dict]:
        """
        List files inside *directory* (relative to workspace).
        Returns a list of dicts: {name, path, size, is_dir}.
        """
        try:
            target = self._safe_path(directory) if directory else self.workspace
            if not target.exists() or not target.is_dir():
                return []

            entries = await asyncio.get_event_loop().run_in_executor(
                None, list, target.iterdir()
            )

            result = []
            for entry in sorted(entries, key=lambda e: (not e.is_dir(), e.name)):
                try:
                    rel = entry.relative_to(self.workspace)
                    stat = entry.stat()
                    result.append(
                        {
                            "name": entry.name,
                            "path": str(rel),
                            "size": stat.st_size,
                            "is_dir": entry.is_dir(),
                        }
                    )
                except Exception:
                    continue
            return result
        except Exception as exc:
            logger.error("list_files(%r) failed: %s", directory, exc)
            return []

    async def delete_file(self, path: str) -> bool:
        """
        Delete a file at *path*. Returns True on success.
        Will not delete directories (use with caution).
        """
        try:
            target = self._safe_path(path)
            if not target.exists():
                return False
            if target.is_dir():
                logger.warning("delete_file called on directory %s – skipping", target)
                return False
            await asyncio.get_event_loop().run_in_executor(None, target.unlink)
            return True
        except Exception as exc:
            logger.error("delete_file(%r) failed: %s", path, exc)
            return False

    async def file_exists(self, path: str) -> bool:
        """Return True if *path* exists in the workspace."""
        try:
            return self._safe_path(path).exists()
        except Exception:
            return False

    async def append_file(self, path: str, content: str) -> bool:
        """Append *content* to an existing (or new) file."""
        try:
            target = self._safe_path(path)
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: target.parent.mkdir(parents=True, exist_ok=True)
            )
            async with aiofiles.open(target, mode="a", encoding="utf-8") as f:
                await f.write(content)
            return True
        except Exception as exc:
            logger.error("append_file(%r) failed: %s", path, exc)
            return False


# Global singleton
_file_manager: Optional[FileManagerTool] = None


def get_file_manager() -> FileManagerTool:
    global _file_manager
    if _file_manager is None:
        from app.config import settings

        _file_manager = FileManagerTool(workspace=settings.sandbox.workspace_path)
    return _file_manager
