---
title: "ADR 0002: Adopt Ultimate Guide practices"
type: decision
tags:
  - decision
status: accepted
date: 2026-10-10
source: https://github.com/FlorianBruniaux/claude-code-ultimate-guide
---

# ADR 0002: Adopt Ultimate Guide practices

Adopted (from the guide's `examples/`):
- Hooks: `dangerous-actions-blocker`, `file-guard` (patched to exit 2 so it blocks), `auto-format`
- Skills: `catchup`, `session-save`, `token-audit`
- Agent: `test-writer`
- Design reference pattern: `design/brand-book.md`
- Lean `CLAUDE.md` (measured ~415 tokens always-on by `context-budget-calculator.sh`)
- `permissions.deny` for `node_modules`, `.nuxt`, `dist`, `yarn.lock`, graphify cache

Not adopted: RTK (needs external binary), guide MCP server (third-party `npx` at runtime), the 290-line code-reviewer agent (token cost).

Related: [[ADR 0001: Use Graphify for code context|0001-use-graphify]], [[Project Overview]].
