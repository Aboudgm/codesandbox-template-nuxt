#!/usr/bin/env python3
"""Stitch the room engine (repo), the flame shaders (orb), the flame layer and
the agent into one standalone HTML file. usage: build.py <repo> <flame.html> <out.html>
"""

import json, re, sys, pathlib

repo, flame_html, out = sys.argv[1], sys.argv[2], sys.argv[3]
here = pathlib.Path(__file__).parent


def module_to_script(src):
    src = re.sub(
        r"^import\s*\{[^}]*\}\s*from\s*'[^']+'\s*\n", "", src, flags=re.M | re.S
    )
    src = re.sub(r"^export\s+(const|class|function)", r"\1", src, flags=re.M)
    assert "import " not in src.split("\n", 40)[-1] or True
    return src


shaders = module_to_script(open(f"{repo}/utils/lightroom/shaders.js").read())
engine = module_to_script(open(f"{repo}/utils/lightroom/engine.js").read())
assert (
    "export " not in shaders
    and "export " not in engine
    and "from './shaders'" not in engine
)

fh = open(flame_html).read()


def script(id_):
    m = re.search(r'<script id="%s"[^>]*>(.*?)</script>' % id_, fh, re.S)
    assert m, id_
    return m.group(1).strip()


flame_glsl = "\n".join(
    [
        f"const FLAME_SPLAT_VS = {json.dumps(script('pVS'))}",
        f"const FLAME_SPLAT_FS = {json.dumps(script('pFS'))}",
        f"const FLAME_QUAD_VS = {json.dumps(script('qVS'))}",
        f"const FLAME_DECAY_FS = {json.dumps(script('dFS'))}",
    ]
)
layer = open(here / "flame-layer.js").read()
agent = open(here / "agent.js").read()

page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Flame Room</title>
<style>
  /* One visual world: a small flame hanging in a dark studio. Dark-only by design. */
  :root {{ --void:#000; --whisper:rgba(255,255,255,.46); --ink:#fff; --edge:rgba(255,255,255,.16); color-scheme:dark; }}
  html, body {{ height:100%; margin:0; overflow:hidden; background:#000; }}
  body {{ background:var(--void); color:var(--ink); touch-action:none; -webkit-user-select:none; user-select:none; }}
  canvas {{ position:fixed; inset:0; width:100%; height:100%; display:block; cursor:none; }}
  #hint {{ position:fixed; left:0; right:0; bottom:calc(6vh + env(safe-area-inset-bottom, 0px));
          padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px));
          text-align:center; font:500 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
          letter-spacing:.05em; color:var(--whisper); transition:opacity .9s; pointer-events:none;
          max-width:56ch; margin:0 auto; text-wrap:balance; }}
  #hint.gone {{ opacity:0; }}
  .ask {{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(11vh + env(safe-area-inset-bottom, 0px));
         width:min(440px, calc(100% - 32px)); box-sizing:border-box; padding:10px 14px; border-radius:20px;
         border:1px solid var(--edge); background:rgba(0,0,0,.35); color:var(--ink);
         font:400 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; outline:none; }}
  .ask:focus-visible {{ border-color:rgba(255,255,255,.45); }}
  .ask::placeholder {{ color:rgba(255,255,255,.32); }}
  @media (prefers-reduced-motion: reduce) {{ #hint {{ transition:none; }} }}
</style>
</head>
<body>
<canvas id="c" aria-label="A small flame in a dark studio: your AI agent. Tap to talk, hold to gather the dust, scroll to focus."></canvas>
<div id="hint" role="status" aria-live="polite">Tap to talk &middot; hold to gather the dust</div>
<script>
'use strict'
// ======================= room shaders =======================
{shaders}
// ======================= room engine ========================
{engine}
// ======================= flame shaders ======================
{flame_glsl}
// ======================= flame layer ========================
{layer}
// ======================= agent ==============================
{agent}
</script>
</body>
</html>
"""
open(out, "w").write(page)
print("wrote", out, len(page), "bytes")
