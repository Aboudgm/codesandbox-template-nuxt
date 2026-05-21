"""
CodeAgent – uses an LLM to write and execute code, retrying on errors.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Optional, TYPE_CHECKING

from app.agents.base import BaseAgent
from app.agents.llm_client import llm_complete
from app.models.agent import AgentState
from app.models.task import AgentType
from app.tools.code_executor import CodeExecutorTool
from app.tools.file_manager import get_file_manager

if TYPE_CHECKING:
    from app.api.websocket import ConnectionManager

logger = logging.getLogger(__name__)

_CODE_SYSTEM = (
    "You are an expert software engineer. When asked to solve a problem with code, "
    "output ONLY the code inside a single fenced code block (```python ... ``` or "
    "```javascript ... ``` or ```bash ... ```). Do not include explanations outside "
    "the code block. The code should be complete and runnable."
)

_MAX_ATTEMPTS = 3


class CodeAgent(BaseAgent):
    """
    Generates code with an LLM, executes it, and iterates on errors.
    """

    def __init__(self, ws_manager: Optional["ConnectionManager"] = None):
        super().__init__(
            name="CodeAgent",
            agent_type=AgentType.CODER,
            ws_manager=ws_manager,
        )
        self._executor = CodeExecutorTool()

    async def run(self, task: Any, context: dict[str, Any]) -> str:
        self.set_state(AgentState.THINKING)
        goal: str = getattr(task, "goal", str(task))
        task_id: Optional[str] = getattr(task, "id", None)
        self.set_task(task_id)

        self.send_message(f"Starting coding task: {goal[:120]}", task_id=task_id)

        research_context = context.get("research", "")
        language = context.get("language", "python")

        last_error: str = ""
        last_code: str = ""
        last_output: str = ""

        for attempt in range(1, _MAX_ATTEMPTS + 1):
            self.set_state(AgentState.THINKING)
            self.send_message(
                f"Generating code (attempt {attempt}/{_MAX_ATTEMPTS})…",
                task_id=task_id,
            )

            prompt = self._build_prompt(
                goal, language, research_context, last_code, last_error, attempt
            )

            try:
                llm_response = await llm_complete(
                    prompt=prompt,
                    system=_CODE_SYSTEM,
                    max_tokens=3000,
                    temperature=0.2,
                )
            except Exception as exc:
                logger.error("LLM call failed: %s", exc)
                return f"Code generation failed: {exc}"

            code, detected_lang = self._extract_code(llm_response, language)
            if not code:
                self.send_message("LLM returned no code block.", task_id=task_id)
                continue

            last_code = code
            self.set_state(AgentState.ACTING)
            self.send_message(
                f"Executing {detected_lang} code ({len(code)} chars)…",
                task_id=task_id,
            )

            result = await self._executor.execute(code, language=detected_lang)
            last_output = result.get("output", "")
            last_error = result.get("error", "")
            exit_code = result.get("exit_code", -1)

            if exit_code == 0 and not last_error:
                self.send_message(
                    f"Code executed successfully.\nOutput:\n{last_output[:500]}",
                    task_id=task_id,
                    metadata={"exit_code": exit_code},
                )
                # Save to workspace
                filename = await self._save_code(code, detected_lang, task_id)
                self.set_state(AgentState.DONE)
                return self._format_result(code, last_output, filename, attempt)

            self.send_message(
                f"Execution error (attempt {attempt}): {last_error[:300]}",
                task_id=task_id,
                metadata={"exit_code": exit_code, "error": last_error},
            )

        # All attempts failed
        self.set_state(AgentState.ERROR)
        self.send_message(
            f"All {_MAX_ATTEMPTS} attempts failed. Last error: {last_error[:300]}",
            task_id=task_id,
        )
        return (
            f"Code execution failed after {_MAX_ATTEMPTS} attempts.\n\n"
            f"**Last code:**\n```{language}\n{last_code}\n```\n\n"
            f"**Last error:**\n```\n{last_error}\n```"
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _build_prompt(
        self,
        goal: str,
        language: str,
        research: str,
        prev_code: str,
        prev_error: str,
        attempt: int,
    ) -> str:
        parts = [f"Task: {goal}"]
        if research:
            parts.append(f"\nRelevant context:\n{research[:1500]}")
        if attempt > 1 and prev_code:
            parts.append(
                f"\nPrevious attempt failed.\n"
                f"Code:\n```{language}\n{prev_code}\n```\n"
                f"Error:\n```\n{prev_error}\n```\n"
                "Please fix the issue and provide a corrected version."
            )
        else:
            parts.append(f"\nWrite {language} code to accomplish this task.")
        return "\n".join(parts)

    @staticmethod
    def _extract_code(text: str, default_lang: str) -> tuple[str, str]:
        """Extract the first fenced code block from LLM output."""
        pattern = re.compile(r"```(\w+)?\n(.*?)```", re.DOTALL)
        match = pattern.search(text)
        if match:
            lang = (match.group(1) or default_lang).lower()
            # Normalize language names
            if lang in ("js", "node"):
                lang = "javascript"
            elif lang in ("sh", "shell", "zsh"):
                lang = "bash"
            return match.group(2).strip(), lang
        # No code block – return the whole text as-is
        return text.strip(), default_lang

    async def _save_code(
        self, code: str, language: str, task_id: Optional[str]
    ) -> str:
        ext_map = {"python": "py", "javascript": "js", "bash": "sh"}
        ext = ext_map.get(language, "txt")
        fname = f"code_{task_id or 'task'}.{ext}"
        fm = get_file_manager()
        await fm.create_file(fname, code)
        return fname

    @staticmethod
    def _format_result(code: str, output: str, filename: str, attempt: int) -> str:
        return (
            f"## Code Execution Result\n\n"
            f"Succeeded on attempt {attempt}. Saved to `{filename}`.\n\n"
            f"```\n{code}\n```\n\n"
            f"**Output:**\n```\n{output}\n```"
        )
