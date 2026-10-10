# Graph Report - codesandbox-template-nuxt  (2026-10-10)

## Corpus Check
- 39 files · ~16,116 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .graphify-bak 1, .toml 1)

## Summary
- 321 nodes · 320 edges · 31 communities (21 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `18cb7660`
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
- Session handoff: [TIMESTAMP]
- Context catchup
- Test writer agent
- /token-audit: Context token audit
- dangerous-actions-blocker.sh
- file-guard.sh
- auto-format.sh
- brand-book.md

## God Nodes (most connected - your core abstractions)
1. `Obsidian Flavored Markdown Skill` - 14 edges
2. `compilerOptions` - 14 edges
3. `Obsidian Bases Skill` - 14 edges
4. `Functions Reference` - 13 edges
5. `JSON Canvas Skill` - 11 edges
6. `Playback` - 10 edges
7. `scripts` - 10 edges
8. `/token-audit: Context token audit` - 9 edges
9. `Embeds Reference` - 9 edges
10. `/session-save` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Playback` --references--> `nextTrack()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue
- `Playback` --references--> `previousTrack()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue
- `Playback` --references--> `toggleRepeat()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue
- `Playback` --references--> `toggleShuffle()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue
- `Lifecycle / data` --references--> `data()`  [INFERRED]
  vault/Components/NeumorphicMusicPlayer.md → components/NeumorphicMusicPlayer.vue

## Import Cycles
- None detected.

## Communities (31 total, 10 thin omitted)

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
Cohesion: 0.20
Nodes (6): Architecture, ADR 0001: Use Graphify for code context, ADR 0002: Adopt Ultimate Guide practices, Code graph, Map, Project Overview

### Community 17 - "Knap"
Cohesion: 0.33
Nodes (5): Batch rendering, Defuddle pipeline, Knap, Templates, Usage

### Community 18 - "Defuddle"
Cohesion: 0.50
Nodes (3): Defuddle, Output formats, Usage

### Community 23 - "Session handoff: [TIMESTAMP]"
Cohesion: 0.11
Nodes (17): Blockers / open questions, Context to reload, Current status, Example 1: Mid-Feature save, Example 2: Context-Pressure save, Examples, Files modified this session, Implementation (+9 more)

### Community 24 - "Context catchup"
Cohesion: 0.12
Nodes (15): Context catchup, 📍 Context restored, Instructions, Output format, ⚠️ Outstanding TODOs, Pro tips, Purpose, 🔄 Recent work (last 5 commits) (+7 more)

### Community 25 - "Test writer agent"
Cohesion: 0.18
Nodes (10): 1. Analyze the code, 2. Create test plan, 3. Write tests, Best practices, Integration test, Test generation process, Test templates, Test writer agent (+2 more)

### Community 26 - "/token-audit: Context token audit"
Cohesion: 0.20
Nodes (9): Interpreting results, Output format, Step 1 — run the measurement, Step 2 — classify rules files, Step 3 — audit hook overhead, Step 4 — build the action plan, Step 5 — the RAG question, /token-audit: Context token audit (+1 more)

### Community 27 - "dangerous-actions-blocker.sh"
Cohesion: 0.83
Nodes (3): canonicalize_path(), path_is_within(), dangerous-actions-blocker.sh script

### Community 28 - "file-guard.sh"
Cohesion: 0.83
Nodes (3): detect_bypass(), is_protected(), file-guard.sh script

## Knowledge Gaps
- **21 isolated node(s):** `babel-core`, `@babel/eslint-parser`, `babel-jest`, `core-js`, `eslint` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 238 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `NeumorphicMusicPlayer.vue` to `package.json`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `babel-core`, `@babel/eslint-parser`, `babel-jest` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `NeumorphicMusicPlayer` connect `NeumorphicMusicPlayer.vue` to `Project Overview.md`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._