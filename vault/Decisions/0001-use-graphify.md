---
title: "ADR 0001: Use Graphify for code context"
type: decision
tags:
  - decision
status: accepted
date: 2026-10-10
---

# ADR 0001: Use Graphify for code context

- **Decision:** Claude queries `graphify-out/graph.json` before reading raw files.
- **Why:** Smaller scoped context per question than reading every file.
- **How:** `CLAUDE.md` rules + PreToolUse hooks in `.claude/settings.json`; git hooks rebuild on commit/checkout.
- **Notes:** AST-only extraction (`--code-only`), no LLM cost.

See [[Project Overview]].
