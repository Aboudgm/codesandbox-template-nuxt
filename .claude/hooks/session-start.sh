#!/bin/bash
# SessionStart: ensure graphify is installed and graphify-out/ (generated, untracked) exists and is fresh.
# Silent on success (no token cost).
command -v graphify >/dev/null 2>&1 || pip install -q --break-system-packages graphifyy >/dev/null 2>&1 || exit 0
command -v graphify >/dev/null 2>&1 || exit 0
if [ -f graphify-out/graph.json ]; then
  graphify update . >/dev/null 2>&1
else
  graphify extract . --code-only >/dev/null 2>&1 \
    && graphify cluster-only . --no-label >/dev/null 2>&1 \
    && graphify export wiki >/dev/null 2>&1
fi
exit 0
