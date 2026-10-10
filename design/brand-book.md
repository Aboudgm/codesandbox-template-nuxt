---
title: Brand Book
tags: [design, tokens]
source: components/NeumorphicMusicPlayer.vue (L232+)
---

# Brand book (neumorphic)

Read before generating any UI. Never hardcode colours; use these CSS variables.

| Token              | Value     | Use                                  |
| ------------------ | --------- | ------------------------------------ |
| `--bg-color`       | `#eff0f3` | Surface and raised/inset base        |
| `--dark-shadow`    | `#b8bcc4` | Neumorphic shadow (bottom-right)     |
| `--light-shadow`   | `#ffffff` | Neumorphic highlight (top-left)      |
| `--text-dark`      | `#0f1829` | Headings, primary text, dark buttons |
| `--text-secondary` | `#6b7280` | Secondary text, icons                |
| `--accent-color`   | `#3b82f6` | Active state (shuffle/repeat)        |
| `--button-bg`      | `#f3f4f6` | Button fill                          |

- Font: Poppins, sans-serif
- Raised: `box-shadow: 8px 8px 16px var(--dark-shadow), -8px -8px 16px var(--light-shadow)`
- Pressed/inset: same offsets with `inset`
- Dark control: `#1e293b` fill, `inset 8px 8px 16px #0a0f1a, inset -8px -8px 16px #1a2435`
- Radius: rounded/circular controls; arch-shaped artwork

Contrast on `--bg-color` (computed): `--text-dark` 15.58:1 (AA/AAA), `--text-secondary` 4.24:1 (AA for text >= 14px bold/18px only), `--accent-color` 3.23:1 (fails AA text; icons/large UI only).
