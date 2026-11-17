/* eslint-disable */
// Plain browser script, stitched into static/flame-room.html by build.py (shares globals with the room engine).
/* =====================================================================
   The agent: ears -> mind -> voice, wired to the flame and the room.
   Ears:  claude.ai dictation, else the browser's SpeechRecognition,
          else a typed line.
   Mind:  your own function (flame.connect), else claude.ai sample,
          else the Claude API with your key (kept in this browser only).
   Voice: claude.ai tts, else the browser's speechSynthesis.
   ===================================================================== */
(() => {
  const q = new URLSearchParams(location.search);
  const canvas = document.getElementById("c");
  const hint = document.getElementById("hint");
  let hintT = 0;
  const say = (msg, ms = 2800) => {
    hint.textContent = msg;
    hint.classList.remove("gone");
    clearTimeout(hintT);
    if (ms) hintT = setTimeout(() => hint.classList.add("gone"), ms);
  };

  let room, flame;
  try {
    const opts = {};
    if (q.get("n")) opts.tex = parseInt(q.get("n"), 10);
    if (q.get("scale")) {
      opts.scale = parseFloat(q.get("scale"));
      opts.fixedScale = true;
    }
    room = new LightRoom(canvas, opts);
    flame = new FlameLayer(room, { particles: q.get("p") ? +q.get("p") : 0 });
    room.start();
  } catch (e) {
    console.error(e);
    say("This room needs WebGL2 with float render targets", 0);
    return;
  }

  // ------------------------------------------------------------ the mind
  const MODEL = "claude-opus-5-5";
  const PERSONA =
    "You are the voice of a small floating flame: an AI agent that hangs in a dark studio full of drifting dust and tumbling cubes, and talks with the person in front of it. " +
    "Reply in one to three short spoken sentences, warm and precise. Plain text only: no markdown, no lists, no emoji. " +
    "If asked what you are, say you are a flame made of folded light that listens, thinks and speaks.";
  const KEY = "flame.anthropicKey";
  const store = {
    get() {
      try {
        return localStorage.getItem(KEY) || "";
      } catch (e) {
        return "";
      }
    },
    set(v) {
      try {
        v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY);
      } catch (e) {}
    },
  };
  const history = [];
  let custom = null;
  let rt = {
    dict: null,
    sample: null,
    tts: null,
    ready: !(window.claude && window.claude.use),
  };

  async function think(text) {
    if (custom) return String(await custom(text, history.slice()));
    const msgs = history.slice(-12);
    if (rt.sample) {
      const r = await rt.sample(
        [
          {
            role: "user",
            content:
              PERSONA +
              "\n\nConversation so far follows. Answer the last message.",
          },
          { role: "assistant", content: "Understood." },
        ].concat(msgs),
        { modelTier: "quick", cache: false }
      );
      return (r && r.text) || "";
    }
    const key = store.get();
    if (!key) throw Object.assign(new Error("no key"), { code: "no_key" });
    // raw HTTP: a single HTML file has no package manager for the SDK
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: PERSONA,
        output_config: { effort: "low" }, // spoken replies: fast and short
        fallbacks: "default", // a refused turn is retried on a fallback model
        messages: msgs,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        (data.error && data.error.message) || "HTTP " + res.status
      );
      err.code =
        res.status === 401
          ? "bad_key"
          : res.status === 429
          ? "rate_limited"
          : res.status >= 500
          ? "overloaded"
          : "bad_request";
      throw err;
    }
    if (data.stop_reason === "refusal")
      return "That is one I will not answer. Ask me something else.";
    return (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
  }

  // ----------------------------------------------------------- the voice
  let speakIv = 0,
    speakT0 = 0,
    posMs = 0,
    speaking = null;
  const wordEnv = (ms) => {
    const t = ms / 1000;
    return Math.min(
      1,
      0.25 +
        Math.max(0, Math.sin(t * 8.1) * 0.65 + Math.sin(t * 3.3 + 1) * 0.35) *
          0.85
    );
  };
  function levelLoop(useTtsPos, estMs) {
    clearInterval(speakIv);
    speakT0 = performance.now();
    posMs = 0;
    speakIv = setInterval(() => {
      const ms = useTtsPos ? posMs : performance.now() - speakT0;
      flame.setLevel(wordEnv(ms));
      if (estMs && performance.now() - speakT0 > estMs) endSpeaking();
    }, 33);
  }
  function endSpeaking() {
    clearInterval(speakIv);
    speakIv = 0;
    speaking = null;
    if (flame.state === "speaking") flame.setState("idle");
  }
  function pickVoice() {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    const lang = (navigator.language || "en").slice(0, 2);
    return (
      vs.find(
        (v) =>
          v.lang.startsWith(lang) &&
          /Natural|Neural|Google|Samantha|Daniel|Aria|Jenny/i.test(v.name)
      ) ||
      vs.find((v) => v.lang.startsWith(lang)) ||
      null
    );
  }
  async function speak(reply) {
    flame.setState("speaking");
    say(reply, 0);
    if (rt.tts) {
      levelLoop(true, 0);
      speaking = "tts";
      try {
        await rt.tts.speak(reply, { voice: "glassy" });
      } catch (e) {}
      endSpeaking();
      say(reply, 6000);
      return;
    }
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      const u = new SpeechSynthesisUtterance(reply);
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onboundary = () => flame.setLevel(0.95);
      u.onend = u.onerror = () => {
        endSpeaking();
        say(reply, 6000);
      };
      speaking = "synth";
      levelLoop(false, 0);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      return;
    }
    speaking = "none";
    levelLoop(false, 900 + reply.length * 62); // no voice here: the flame mouths it
  }
  function stopVoice() {
    if (speaking === "tts" && rt.tts) rt.tts.stop().catch(() => {});
    if (speaking === "synth" && window.speechSynthesis)
      speechSynthesis.cancel();
    endSpeaking();
  }

  // ------------------------------------------------------------ the loop
  let busy = false;
  async function ask(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    flame.setState("thinking");
    say("“" + text + "”", 0);
    history.push({ role: "user", content: text });
    let reply = "";
    try {
      reply = (await think(text)) || "I lost the thread. Ask me again?";
    } catch (e) {
      history.pop();
      busy = false;
      flame.setState("idle");
      if (e.code === "no_key") {
        showInput("key");
        say("Give me a mind: paste an Anthropic API key", 0);
        return;
      }
      if (e.code === "bad_key") {
        store.set("");
        showInput("key");
        say("That key was refused. Paste another one", 0);
        return;
      }
      reply =
        e.code === "rate_limited"
          ? "Too many questions at once. Give me a moment."
          : e.code === "not_granted"
          ? "I am not allowed to think here."
          : "Something went dark on my side. Try again.";
      busy = false;
      speak(reply);
      return;
    }
    history.push({ role: "assistant", content: reply });
    busy = false;
    speak(reply);
  }

  // ------------------------------------------------------------- the ears
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null,
    heard = "",
    interim = "";
  function listenBrowser() {
    if (!SR) return false;
    rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    heard = "";
    interim = "";
    rec.onresult = (e) => {
      interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) heard += r[0].transcript;
        else interim += r[0].transcript;
      }
      say((heard + " " + interim).trim(), 0);
      flame.setLevel(0.55 + 0.4 * Math.random());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        showInput("message");
        say("Mic is blocked here, type instead", 4000);
      } else if (e.error === "no-speech")
        say("I heard nothing. Tap to try again", 2500);
      else if (e.error !== "aborted") {
        showInput("message");
        say("Listening failed (" + e.error + "), type instead", 4000);
      }
    };
    rec.onend = () => {
      const h = (heard + " " + interim).trim();
      rec = null;
      if (h) ask(h);
      else if (flame.state === "listening") flame.setState("idle");
    };
    try {
      rec.start();
    } catch (e) {
      rec = null;
      return false;
    }
    voiceOn(true); // the flame keeps following your voice
    flame.setState("listening");
    say("Listening…", 0);
    return true;
  }

  let input = null,
    inputMode = "";
  function showInput(mode) {
    inputMode = mode;
    if (!input) {
      input = document.createElement("input");
      input.className = "ask";
      input.id = "ask";
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.addEventListener("pointerdown", (e) => e.stopPropagation());
      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          input.blur();
          return;
        }
        if (e.key !== "Enter") return;
        const v = input.value.trim();
        input.value = "";
        if (!v) return;
        if (inputMode === "key") {
          if (!/^sk-ant-/.test(v)) {
            say("That does not look like an Anthropic key (sk-ant-…)", 3500);
            return;
          }
          store.set(v);
          showInput("message");
          say("Key saved in this browser. Ask me anything", 3500);
          return;
        }
        ask(v);
      });
      document.body.appendChild(input);
    }
    input.type = mode === "key" ? "password" : "text";
    input.placeholder =
      mode === "key"
        ? "Anthropic API key — stays in this browser"
        : "Type to the flame and press Enter";
    input.setAttribute("aria-label", input.placeholder);
    input.focus();
  }

  const hasMind = () => !!(custom || rt.sample || store.get());
  function tap() {
    if (flame.state === "speaking") {
      stopVoice();
      return;
    }
    if (rec) {
      rec.stop();
      return;
    }
    if (rt.dict && rt.dict.active()) {
      rt.dict.stop().catch(() => {});
      return;
    }
    if (!rt.ready) {
      say("Waking up…", 1500);
      return;
    }
    if (!hasMind()) {
      showInput("key");
      say(
        "Give me a mind: paste an Anthropic API key, or call flame.connect(fn)",
        0
      );
      return;
    }
    if (rt.dict) {
      // claude.ai dictation, started straight from the tap
      heard = "";
      flame.setState("listening");
      say("Listening…", 0);
      rt.dict.start().catch((e) => {
        flame.setState("idle");
        if (e && e.code === "dismissed")
          say("Tap again when you want to talk", 3000);
        else if (e && e.code !== "stopped") {
          rt.dict = null;
          showInput("message");
          say("Dictation is off here, type instead", 4000);
        }
      });
      return;
    }
    if (listenBrowser()) return;
    showInput("message");
  }

  // -------------------------------------------------------------- input
  const ndc = (e) => {
    const r = canvas.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * 2 - 1,
      1 - ((e.clientY - r.top) / r.height) * 2,
    ];
  };
  let downAt = 0,
    holdTimer = 0,
    holding = false,
    isDown = false;
  canvas.addEventListener("pointermove", (e) => {
    const [x, y] = ndc(e);
    room.setPointer(x, y);
    flame.setPointer(x, y, isDown ? 1 : 0.5);
  });
  // the mic: analysed only (loudness, pitch, bands), never recorded or sent.
  // It starts on the first touch, because browsers need a gesture for it.
  let micWanted = true, micAsked = false;
  function voiceOn(quiet) {
    if (!micWanted) return;
    flame
      .useMic()
      .then(() => { if (!quiet) say("The flame now follows your voice \u00b7 M to mute it", 3500); })
      .catch(() => { if (!quiet) say("No mic here: the flame follows your pointer and its own voice", 3500); });
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    if (!micAsked) { micAsked = true; voiceOn(false); }
    isDown = true;
    const [x, y] = ndc(e);
    room.setPointer(x, y);
    flame.setPointer(x, y, 1);
    downAt = performance.now();
    holding = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      holding = true;
      room.setHold(true);
    }, 350);
  });
  const up = () => {
    if (!isDown) return;
    isDown = false;
    clearTimeout(holdTimer);
    if (holding) {
      room.setHold(false);
      holding = false;
      return;
    } // release: the gathered dust bursts
    if (performance.now() - downAt < 350) tap();
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", () => {
    isDown = false;
    clearTimeout(holdTimer);
    if (holding) room.setHold(false);
    holding = false;
  });
  canvas.addEventListener("pointerleave", () => {
    if (!isDown) {
      flame.setPointer(0, 0, 0);
      room.releasePointer(); // the flame drifts home to the centre, then rests
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      room.rackFocus(e.deltaY);
    },
    { passive: false }
  );
  addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;
    const S = ["idle", "listening", "thinking", "speaking"];
    if (e.key >= "1" && e.key <= "4") flame.setState(S[+e.key - 1]);
    else if (e.code === "Space") {
      e.preventDefault();
      tap();
    } else if (e.key === "t" || e.key === "T")
      showInput(hasMind() ? "message" : "key");
    else if (e.key === "m" || e.key === "M") {
      micWanted = !micWanted;
      if (micWanted) voiceOn(false);
      else { flame.stopMic(); say("Mic off \u00b7 M to turn it back on", 2500); }
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) room.stop();
    else room.start();
  });

  // ---------------------------------------------------------- public API
  window.flame = {
    room,
    layer: flame,
    say,
    get state() {
      return flame.state;
    },
    setState: (s) => flame.setState(s),
    setLevel: (v) => flame.setLevel(v),
    setPitch: (v) => flame.setPitch(v),
    useMic: () => flame.useMic(),
    stopMic: () => flame.stopMic(),
    get voice() { return { level: flame.level, pitch: flame.pitch, hz: flame.hz || 0, bass: flame.bass, treble: flame.treble || 0, motion: flame.motion }; },
    useOutputElement: (el) => flame.useOutputElement(el),
    useOutputStream: (s) => flame.useOutputStream(s),
    demo: (on) => flame.demo(on),
    ask,
    connect(fn) {
      custom = typeof fn === "function" ? fn : null;
    }, // your agent: async (text, history) => reply
    forgetKey() {
      store.set("");
    },
    get ready() {
      return rt.ready;
    },
  };
  window.orb = window.flame;
  addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.type !== "orb") return;
    if (d.state) flame.setState(d.state);
    if (d.level !== undefined) flame.setLevel(d.level);
    if (d.pitch !== undefined) flame.setPitch(d.pitch);
    if (d.ask) ask(String(d.ask));
  });
  if (q.get("state")) flame.setState(q.get("state"));
  if (q.has("demo")) flame.demo(true);

  say("Tap to talk · hold to gather the dust · scroll to focus", 5000);
  if (window.claude && window.claude.use) {
    Promise.all(
      ["dictation", "sample", "tts"].map((n) =>
        window.claude.use(n).catch(() => null)
      )
    ).then(([d, s, t]) => {
      rt = { dict: d, sample: s, tts: t, ready: true };
      if (d) {
        d.onPartial(({ text }) => {
          if (text) {
            say(heard + " " + text, 0);
            flame.setLevel(0.55 + 0.35 * Math.random());
          }
        });
        d.onFinal(({ text }) => {
          heard = (heard + text).trim();
          say(heard, 0);
          flame.setLevel(0.8);
        });
        d.onState(({ state }) => {
          if (state === "idle") {
            const h = heard;
            heard = "";
            if (h) ask(h);
            else if (flame.state === "listening") flame.setState("idle");
          }
        });
      }
      if (t) {
        t.onPosition(({ ms }) => {
          posMs = ms;
        });
        t.onState(({ state }) => {
          if (state === "idle" && speaking === "tts") endSpeaking();
        });
      }
    });
  }
})();
