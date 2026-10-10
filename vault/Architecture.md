---
title: Architecture
type: architecture
tags:
  - project
  - architecture
created: 2026-10-10
---

# Architecture

```mermaid
graph TD
  index["pages/index.vue"] --> Player["components/NeumorphicMusicPlayer.vue"]
  Player --> vue
  Tests["test/NuxtLogo.spec.js"] --> Logo["components/NuxtLogo.vue"]
```

| Path | Role |
| --- | --- |
| `pages/index.vue` | Route `/`; imports [[NeumorphicMusicPlayer]] |
| `components/NeumorphicMusicPlayer.vue` | Player UI + playback state |
| `components/NuxtLogo.vue`, `Tutorial.vue` | Template leftovers |
| `store/` | Empty (README only) |
| `test/NuxtLogo.spec.js` | Jest spec |

> [!tip] Query the graph
> `graphify query "music player progress animation"`
> `graphify path "index.vue" "NeumorphicMusicPlayer.vue"`

Back to [[Project Overview]].
