# Graph Report - codesandbox-template-nuxt  (2026-10-10)

## Corpus Check
- 30 files · ~11,520 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 7, .graphify-bak 1, .ico 1)

## Summary
- 251 nodes · 254 edges · 23 communities (15 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e6ca0d62`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- NeumorphicMusicPlayer.vue
- devDependencies
- compilerOptions
- scripts
- dependencies
- Obsidian Bases Skill
- JSON Canvas Skill
- Embeds Reference
- Functions Reference
- Obsidian Flavored Markdown Skill
- Obsidian CLI
- Project Overview.md
- Knap
- Defuddle
- Nuxt
- CLAUDE.md
- .claude/CLAUDE.md
- store/README.md

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 14 edges
2. `Obsidian Bases Skill` - 14 edges
3. `Obsidian Flavored Markdown Skill` - 14 edges
4. `Functions Reference` - 13 edges
5. `JSON Canvas Skill` - 11 edges
6. `scripts` - 10 edges
7. `Playback` - 10 edges
8. `Embeds Reference` - 9 edges
9. `Obsidian CLI` - 7 edges
10. `Nodes` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Playback` --references--> `toggleShuffle()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue
- `Playback` --references--> `toggleRepeat()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue
- `Playback` --references--> `previousTrack()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue
- `Playback` --references--> `nextTrack()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue
- `Lifecycle / data` --references--> `data()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue

## Import Cycles
- None detected.

## Communities (23 total, 8 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.07
Nodes (25): name, private, version, babel-core, @babel/eslint-parser, babel-jest, core-js, eslint (+17 more)

### Community 1 - "NeumorphicMusicPlayer.vue"
Cohesion: 0.18
Nodes (19): data(), goBack(), mounted(), nextTrack(), openMenu(), previousTrack(), progressValue(), startProgressAnimation() (+11 more)

### Community 2 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, babel-core, @babel/eslint-parser, babel-jest, eslint, eslint-config-prettier, eslint-plugin-nuxt, eslint-plugin-vue (+9 more)

### Community 3 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, baseUrl, esModuleInterop, experimentalDecorators, lib, module, moduleResolution (+7 more)

### Community 4 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, generate, lint, lint:js, lint:prettier, lintfix (+2 more)

### Community 5 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, core-js, nuxt, @nuxtjs/axios, vue, vue-server-renderer, vue-template-compiler, webpack

### Community 6 - "Obsidian Bases Skill"
Cohesion: 0.07
Nodes (30): Cards View, Common Formula Errors, Complete Examples, Daily Notes Index, Date Arithmetic, Default Summary Formulas, Duration Type, Embedding Bases (+22 more)

### Community 11 - "JSON Canvas Skill"
Cohesion: 0.07
Nodes (25): Flowchart, JSON Canvas Complete Examples, Project Board with Groups, Research Canvas with Files and Links, Simple Canvas with Text and Connections, 1. Create a New Canvas, 2. Add a Node to an Existing Canvas, 3. Connect Two Nodes (+17 more)

### Community 12 - "Embeds Reference"
Cohesion: 0.09
Nodes (19): Basic Callout, Callouts Reference, Custom Callouts (CSS), Foldable Callouts, Nested Callouts, Supported Callout Types, Embed Audio, Embed Bases (+11 more)

### Community 13 - "Functions Reference"
Cohesion: 0.13
Nodes (13): Any Type Functions, Date Arithmetic, Date Functions & Fields, Duration Type, File Functions, Functions Reference, Global Functions, Link Functions (+5 more)

### Community 14 - "Obsidian Flavored Markdown Skill"
Cohesion: 0.14
Nodes (14): Callouts, Comments, Complete Example, Diagrams (Mermaid), Embeds, Footnotes, Internal Links (Wikilinks), Math (LaTeX) (+6 more)

### Community 15 - "Obsidian CLI"
Cohesion: 0.20
Nodes (9): Additional developer commands, Command reference, Common patterns, Develop/test cycle, File targeting, Obsidian CLI, Plugin development, Syntax (+1 more)

### Community 16 - "Project Overview.md"
Cohesion: 0.25
Nodes (5): Architecture, ADR 0001: Use Graphify for code context, Code graph, Map, Project Overview

### Community 17 - "Knap"
Cohesion: 0.33
Nodes (5): Batch rendering, Defuddle pipeline, Knap, Templates, Usage

### Community 18 - "Defuddle"
Cohesion: 0.50
Nodes (3): Defuddle, Output formats, Usage

## Knowledge Gaps
- **21 isolated node(s):** `@nuxtjs/axios`, `core-js`, `nuxt`, `vue-server-renderer`, `vue-template-compiler` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 188 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `NeumorphicMusicPlayer.vue` to `package.json`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `@nuxtjs/axios`, `core-js`, `nuxt` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `Obsidian Bases Skill` connect `Obsidian Bases Skill` to `Functions Reference`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._