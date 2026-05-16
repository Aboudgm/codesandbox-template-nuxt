<template>
  <div class="conn-root">
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>

    <div class="conn-wrap">
      <!-- Animated chip art -->
      <div class="chip-art">
        <div class="chip-body">
          <div class="chip-pins top">
            <span v-for="i in 14" :key="'t'+i" class="chip-pin" :style="{ animationDelay: (i * 0.07) + 's' }"></span>
          </div>
          <div class="chip-core">
            <div class="core-label">SG2002</div>
            <div class="core-sub">RISC-V · ARM · 1 TOPS NPU</div>
            <div class="core-icon"><i class="fas fa-microchip"></i></div>
            <div class="core-specs">
              <span>256MB DDR3</span>
              <span>22×35mm</span>
            </div>
          </div>
          <div class="chip-pins bottom">
            <span v-for="i in 14" :key="'b'+i" class="chip-pin" :style="{ animationDelay: (i * 0.06 + 0.6) + 's' }"></span>
          </div>
        </div>
      </div>

      <div class="conn-header">
        <h1>LicheeRV <span>Nano</span></h1>
        <p>Your personal RISC-V device dashboard</p>
      </div>

      <!-- Status banner: either "ready to connect" or "couldn't connect" -->
      <div v-if="!error" class="status-banner ready">
        <div class="status-icon"><i class="fas fa-ethernet"></i></div>
        <div class="status-text">
          <strong>Ready to connect</strong>
          <span>Connecting to your device at <code>{{ DEVICE_IP }}</code></span>
        </div>
      </div>
      <div v-else class="status-banner failed">
        <div class="status-icon pulse-red"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="status-text">
          <strong>Could not connect automatically</strong>
          <span>{{ friendlyError }}</span>
        </div>
      </div>

      <!-- Checklist (always visible) -->
      <div class="checklist-card">
        <div class="checklist-title"><i class="fas fa-clipboard-check"></i> Make sure these are OK</div>
        <div class="checklist-item">
          <div class="check-bullet"><i class="fas fa-plug"></i></div>
          <div class="check-text">
            <strong>Ethernet cable is plugged in</strong>
            <span>Between your Mac and the LicheeRV Nano</span>
          </div>
        </div>
        <div class="checklist-item">
          <div class="check-bullet"><i class="fas fa-power-off"></i></div>
          <div class="check-text">
            <strong>Device is powered on</strong>
            <span>The green LED on the board should be lit</span>
          </div>
        </div>
        <div class="checklist-item">
          <div class="check-bullet"><i class="fas fa-network-wired"></i></div>
          <div class="check-text">
            <strong>Device IP is {{ DEVICE_IP }}</strong>
            <span>Verify in your Mac terminal: <code>arp -a | grep 192.168</code></span>
          </div>
        </div>
      </div>

      <!-- Login form -->
      <div class="conn-card">
        <div class="conn-card-title">
          <i class="fas fa-key"></i>
          Sign in to your device
        </div>

        <div class="form-row">
          <label>Username</label>
          <div class="input-wrap">
            <i class="fas fa-user"></i>
            <input v-model="form.username" type="text" placeholder="root" :disabled="connecting" @keyup.enter="submit" />
          </div>
        </div>

        <div class="form-row">
          <label>Password</label>
          <div class="input-wrap">
            <i class="fas fa-lock"></i>
            <input
              ref="passInput"
              v-model="form.password"
              :type="showPass ? 'text' : 'password'"
              placeholder="root"
              :disabled="connecting"
              @keyup.enter="submit"
            />
            <button type="button" class="pass-toggle" @click="showPass = !showPass">
              <i :class="showPass ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <div class="field-hint" v-if="!error">
            <i class="fas fa-info-circle"></i>
            Default login: <code>root</code> / <code>root</code>
          </div>
        </div>

        <button class="connect-btn" :disabled="connecting" @click="submit">
          <span v-if="!connecting" class="btn-inner">
            <i class="fas fa-bolt"></i>
            {{ error ? 'Try Again' : 'Connect to My Device' }}
          </span>
          <span v-else class="btn-inner">
            <span class="spinner"></span> Connecting...
          </span>
        </button>
      </div>

      <div class="footer-note">
        <i class="fas fa-lock-open"></i>
        Connecting locally to <strong>{{ DEVICE_IP }}</strong> — nothing is sent to the internet
      </div>

      <div class="specs-row">
        <span class="spec-chip"><i class="fas fa-microchip"></i> SG2002</span>
        <span class="spec-chip"><i class="fas fa-memory"></i> 256MB DDR3</span>
        <span class="spec-chip"><i class="fas fa-ethernet"></i> 100 Mbps</span>
        <span class="spec-chip"><i class="fas fa-brain"></i> 1 TOPS NPU</span>
        <span class="spec-chip"><i class="fab fa-linux"></i> Linux</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

const DEVICE_IP = '192.168.68.63'

const FRIENDLY_ERRORS: Array<{ match: string; msg: string }> = [
  { match: 'auth', msg: 'Wrong password. The default password is "root" — try that below.' },
  { match: 'password', msg: 'Wrong password. Try "root" as the password below.' },
  { match: 'refused', msg: 'Device rejected the connection. SSH may not be running — try rebooting the Nano.' },
  { match: 'timeout', msg: 'Device not responding. Check the Ethernet cable and that the device is powered on.' },
  { match: 'etimedout', msg: 'Timed out. The device may be starting up — wait 30 seconds and try again.' },
  { match: 'timed out', msg: 'Timed out. The device may be starting up — wait 30 seconds and try again.' },
  { match: 'unreachable', msg: 'Cannot reach the device. Is the Ethernet cable plugged in on both ends?' },
  { match: 'network', msg: 'Network problem. Try unplugging and re-plugging the Ethernet cable.' },
]

export default Vue.extend({
  name: 'LicheeConnection',
  props: {
    connecting: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  data() {
    return {
      DEVICE_IP,
      showPass: false,
      form: { username: 'root', password: 'root' },
    }
  },
  computed: {
    friendlyError(): string {
      const e = this.error.toLowerCase()
      const match = FRIENDLY_ERRORS.find(f => e.includes(f.match))
      return match ? match.msg : 'Connection failed. Check the steps above and try again.'
    },
  },
  methods: {
    submit() {
      if (this.connecting) return
      this.$emit('connect', {
        host: DEVICE_IP,
        port: 22,
        username: this.form.username,
        password: this.form.password,
      })
    },
  },
})
</script>

<style scoped>
.conn-root {
  width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg); position: relative; overflow: hidden; overflow-y: auto;
}

.bg-grid {
  position: fixed; inset: 0;
  background-image: linear-gradient(rgba(255,140,66,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,140,66,0.04) 1px, transparent 1px);
  background-size: 40px 40px; pointer-events: none;
}
.bg-glow {
  position: fixed; width: 700px; height: 700px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,140,66,0.07) 0%, transparent 70%);
  top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none;
}

.conn-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  width: 100%; max-width: 460px; padding: 24px 16px; position: relative; z-index: 1;
}

/* ── Chip art ── */
.chip-art { display: flex; align-items: center; justify-content: center; }
.chip-body { display: flex; flex-direction: column; align-items: center; }
.chip-pins { display: flex; gap: 5px; padding: 0 10px; }
.chip-pin {
  width: 8px; height: 14px; background: var(--accent); border-radius: 2px;
  opacity: 0; animation: pin-appear 0.5s ease forwards, pin-glow 3s ease-in-out infinite;
}
@keyframes pin-appear { to { opacity: 0.65; } }
@keyframes pin-glow { 0%,100% { opacity: 0.55; } 50% { opacity: 1; box-shadow: 0 0 6px var(--accent-glow); } }

.chip-core {
  background: linear-gradient(135deg, var(--card2), var(--card));
  border: 1px solid var(--border2); border-radius: 8px;
  padding: 14px 36px; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 230px;
  box-shadow: 0 0 30px rgba(255,140,66,0.1), inset 0 1px 0 rgba(255,255,255,0.04);
}
.core-label { font-size: 17px; font-weight: 700; color: var(--text); letter-spacing: 2px; }
.core-sub { font-size: 9px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; }
.core-icon { font-size: 22px; color: var(--accent); margin: 6px 0; text-shadow: 0 0 12px var(--accent-glow); }
.core-specs { display: flex; gap: 10px; }
.core-specs span { font-size: 9px; color: var(--text-faint); background: var(--border); padding: 2px 6px; border-radius: 4px; }

.conn-header { text-align: center; }
.conn-header h1 { font-size: 26px; font-weight: 700; color: var(--text); letter-spacing: -0.5px; }
.conn-header h1 span { color: var(--accent); }
.conn-header p { font-size: 12px; color: var(--text-dim); margin-top: 3px; }

/* ── Status banners ── */
.status-banner {
  width: 100%; display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; border-radius: var(--radius-sm); border: 1px solid;
}
.status-banner.ready {
  background: var(--green-dim); border-color: rgba(94,234,212,0.2);
}
.status-banner.failed {
  background: var(--red-dim); border-color: rgba(248,113,113,0.25);
}
.status-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
}
.status-banner.ready .status-icon { background: rgba(94,234,212,0.15); color: var(--green); }
.status-banner.failed .status-icon { background: rgba(248,113,113,0.15); color: var(--red); }
.pulse-red { animation: pulse-red 1.2s ease infinite; }
@keyframes pulse-red { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.status-text { display: flex; flex-direction: column; gap: 3px; }
.status-text strong { font-size: 13px; font-weight: 600; }
.status-banner.ready .status-text strong { color: var(--green); }
.status-banner.failed .status-text strong { color: var(--red); }
.status-text span { font-size: 12px; color: var(--text-dim); }
.status-text code { font-family: 'JetBrains Mono', monospace; font-size: 11px; background: var(--border); padding: 1px 5px; border-radius: 3px; color: var(--accent); }

/* ── Checklist ── */
.checklist-card {
  width: 100%; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 16px; display: flex; flex-direction: column; gap: 12px;
}
.checklist-title {
  font-size: 11px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px;
  display: flex; align-items: center; gap: 7px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
}
.checklist-title i { color: var(--accent); }
.checklist-item { display: flex; align-items: flex-start; gap: 12px; }
.check-bullet {
  width: 32px; height: 32px; border-radius: 8px; background: var(--card2); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--accent); flex-shrink: 0;
}
.check-text { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; }
.check-text strong { font-size: 12px; font-weight: 600; color: var(--text); }
.check-text span { font-size: 11px; color: var(--text-dim); }
.check-text code { font-family: 'JetBrains Mono', monospace; font-size: 10px; background: var(--border); padding: 1px 5px; border-radius: 3px; color: var(--accent); }

/* ── Form card ── */
.conn-card {
  width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 22px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.conn-card-title {
  font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px;
  padding-bottom: 12px; border-bottom: 1px solid var(--border);
}
.conn-card-title i { color: var(--accent); }

.form-row { display: flex; flex-direction: column; gap: 5px; }
.form-row label { font-size: 10px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.7px; }

.input-wrap { position: relative; display: flex; align-items: center; }
.input-wrap > i { position: absolute; left: 11px; font-size: 11px; color: var(--text-faint); pointer-events: none; }
.input-wrap input {
  width: 100%; padding: 10px 11px 10px 32px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text); font-size: 14px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; font-family: 'Inter', sans-serif;
}
.input-wrap input::placeholder { color: var(--text-faint); }
.input-wrap input:focus { border-color: rgba(255,140,66,0.4); box-shadow: 0 0 0 3px rgba(255,140,66,0.08); }
.input-wrap input:disabled { opacity: 0.5; cursor: not-allowed; }

.pass-toggle { position: absolute; right: 9px; background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 12px; padding: 6px; transition: color 0.15s; }
.pass-toggle:hover { color: var(--text-dim); }

.field-hint { display: flex; align-items: flex-start; gap: 5px; font-size: 11px; color: var(--text-faint); margin-top: 4px; }
.field-hint i { color: var(--blue); font-size: 10px; flex-shrink: 0; margin-top: 1px; }
.field-hint code { background: var(--border); padding: 1px 4px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--accent); }

.connect-btn {
  width: 100%; padding: 14px; background: linear-gradient(135deg, #FF8C42, #E07530); border: none; border-radius: var(--radius-sm);
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  box-shadow: 0 4px 18px rgba(255,140,66,0.35); margin-top: 4px;
}
.connect-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(255,140,66,0.45); }
.connect-btn:active:not(:disabled) { transform: translateY(0); }
.connect-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  animation: spin 0.7s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Footer ── */
.footer-note {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--text-faint);
}
.footer-note i { color: var(--green); font-size: 10px; }
.footer-note strong { color: var(--text-dim); }

.specs-row { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.spec-chip { display: flex; align-items: center; gap: 4px; padding: 3px 9px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; font-size: 10px; color: var(--text-dim); }
.spec-chip i { font-size: 9px; color: var(--accent); }
</style>
