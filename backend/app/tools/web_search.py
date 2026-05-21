"""
Web search tool using DuckDuckGo and BeautifulSoup for page fetching.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


class WebSearchTool:
    """Async wrapper around DuckDuckGo search + page fetching."""

    def __init__(self, timeout: int = 15):
        self.timeout = timeout

    async def search(self, query: str, max_results: int = 5) -> list[dict[str, str]]:
        """
        Search the web using DuckDuckGo.

        Returns a list of dicts with keys: title, url, snippet.
        Falls back to an empty list on any error.
        """
        try:
            results = await asyncio.get_event_loop().run_in_executor(
                None, self._ddg_search, query, max_results
            )
            return results
        except Exception as exc:
            logger.warning("Web search failed for query %r: %s", query, exc)
            return []

    @staticmethod
    def _ddg_search(query: str, max_results: int) -> list[dict[str, str]]:
        from duckduckgo_search import DDGS

        results: list[dict[str, str]] = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append(
                    {
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                    }
                )
        return results

    async def fetch_page(self, url: str, max_chars: int = 8000) -> str:
        """
        Fetch the text content of a URL.

        Uses aiohttp + BeautifulSoup. Returns extracted text (truncated to
        *max_chars*) or an error message string.
        """
        try:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            async with aiohttp.ClientSession(
                headers=_HEADERS, timeout=timeout
            ) as session:
                async with session.get(url, allow_redirects=True) as resp:
                    if resp.status != 200:
                        return f"[HTTP {resp.status}] Could not fetch {url}"
                    html = await resp.text(errors="replace")

            soup = BeautifulSoup(html, "html.parser")

            # Remove noisy tags
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            text = soup.get_text(separator="\n", strip=True)
            # Collapse excessive blank lines
            lines = [ln for ln in text.splitlines() if ln.strip()]
            text = "\n".join(lines)

            return text[:max_chars]

        except asyncio.TimeoutError:
            return f"[Timeout] Could not fetch {url}"
        except Exception as exc:
            logger.warning("fetch_page failed for %s: %s", url, exc)
            return f"[Error] {exc}"
