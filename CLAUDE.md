## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- `graphify-out/` is generated and untracked; `.claude/hooks/session-start.sh` installs graphify and rebuilds it each session.

## Project

Nuxt 2 / Vue 2 (webpack 4). Single page `pages/index.vue` → `components/NeumorphicMusicPlayer.vue`. Vuex in `store/`.

Commands (Node 22 needs `NODE_OPTIONS=--openssl-legacy-provider` for build/generate):
- `yarn lint` — ESLint + Prettier (run before claiming done)
- `yarn test` — Jest
- `yarn generate` — static build (Netlify uses it, Node 18)

Boundaries:
- Do not edit `yarn.lock`, `dist/`, `.nuxt/`, `graphify-out/` by hand.
- No new dependencies without asking.
- UI: read `design/brand-book.md` first; use CSS variables, never hardcode colours.

Token discipline:
- Query graphify before reading files; read only line ranges you need.
- Prefer `/compact` at ~70% context, `/clear` between unrelated tasks.
- Use `/catchup` after `/clear`, `/session-save` before stopping, `/token-audit` to measure overhead.
- Delegate test writing to the `test-writer` agent.
