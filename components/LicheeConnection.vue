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
        <p>Device Dashboard Interface</p>
      </div>

      <!-- Saved connection notice -->
      <div v-if="hasSaved" class="saved-banner" @click="loadSaved">
        <i class="fas fa-history"></i>
        <span>Resume last session: <strong>{{ savedHost }}</strong></span>
        <span class="load-hint">Click to load</span>
      </div>

      <div class="conn-card">
        <div v-if="error" class="error-bar">
          <i class="fas fa-exclamation-triangle"></i>
          <div class="error-body">
            <span class="error-msg">{{ error }}</span>
            <span class="error-tip">{{ errorTip }}</span>
          </div>
        </div>

        <div class="form-row">
          <label>IP Address</label>
          <div class="input-wrap">
            <i class="fas fa-network-wired"></i>
            <input v-model="form.host" type="text" placeholder="192.168.x.x" :disabled="connecting" @keyup.enter="submit" />
          </div>
        </div>

        <div class="form-row-group">
          <div class="form-row">
            <label>Username</label>
            <div class="input-wrap">
              <i class="fas fa-user"></i>
              <input v-model="form.username" type="text" placeholder="root" :disabled="connecting" @keyup.enter="submit" />
            </div>
          </div>
          <div class="form-row">
            <label>Port</label>
            <div class="input-wrap">
              <i class="fas fa-hashtag"></i>
              <input v-model="form.port" type="number" placeholder="22" :disabled="connecting" @keyup.enter="submit" />
            </div>
          </div>
        </div>

        <div class="form-row">
          <label>
            Password
            <span class="optional-badge">optional</span>
          </label>
          <div class="input-wrap">
            <i class="fas fa-lock"></i>
            <input
              v-model="form.password"
              :type="showPass ? 'text' : 'password'"
              placeholder="Leave empty if no password"
              :disabled="connecting"
              @keyup.enter="submit"
            />
            <button type="button" class="pass-toggle" @click="showPass = !showPass" :title="showPass ? 'Hide' : 'Show'">
              <i :class="showPass ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <div class="field-hint">
            <i class="fas fa-info-circle"></i>
            Default for LicheeRV Nano: <code>root</code> — or leave blank if passwordless SSH is configured
          </div>
        </div>

        <label class="remember-row">
          <input type="checkbox" v-model="rememberMe" />
          <span>Remember this connection</span>
        </label>

        <button class="connect-btn" :disabled="!form.host.trim() || connecting" @click="submit">
          <span v-if="!connecting" class="btn-inner"><i class="fas fa-bolt"></i> Connect to Device</span>
          <span v-else class="btn-inner"><span class="spinner"></span> Establishing SSH...</span>
        </button>
      </div>

      <!-- Quick help -->
      <details class="help-section">
        <summary><i class="fas fa-question-circle"></i> Having trouble connecting?</summary>
        <div class="help-body">
          <div class="help-item"><i class="fas fa-check-circle"></i> Make sure Ethernet is connected between your Mac and the Nano</div>
          <div class="help-item"><i class="fas fa-check-circle"></i> Default credentials: <code>root</code> / <code>root</code> (or <code>cvitek</code>)</div>
          <div class="help-item"><i class="fas fa-check-circle"></i> Find the IP with: <code>arp -a</code> on your Mac</div>
          <div class="help-item"><i class="fas fa-check-circle"></i> Or check the device serial console at 115200 baud</div>
        </div>
      </details>

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

const STORAGE_KEY = 'lichee_last_conn'

export default Vue.extend({
  name: 'LicheeConnection',
  props: {
    connecting: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  data() {
    return {
      showPass: false,
      rememberMe: true,
      hasSaved: false,
      savedHost: '',
      form: { host: '', port: 22, username: 'root', password: '' },
    }
  },
  computed: {
    errorTip(): string {
      const e = this.error.toLowerCase()
      if (e.includes('econnrefused') || e.includes('refused')) return 'SSH is not running on the device — try rebooting it'
      if (e.includes('timeout') || e.includes('etimedout') || e.includes('timed out')) return 'Device unreachable — check Ethernet cable and IP address'
      if (e.includes('auth') || e.includes('password') || e.includes('permission') || e.includes('authentication')) return 'Try the password "root" or leave it empty for passwordless SSH'
      if (e.includes('enotfound') || e.includes('getaddrinfo')) return 'Use an IP address like 192.168.x.x instead of a hostname'
      if (e.includes('enetunreach') || e.includes('network')) return 'Network unreachable — is the Ethernet cable connected?'
      return 'Check device power, Ethernet cable, and that the IP is correct'
    },
  },
  mounted() {
    this.loadSavedIfExists()
  },
  methods: {
    loadSavedIfExists() {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.host) {
            this.hasSaved = true
            this.savedHost = parsed.host
          }
        }
      } catch (_) {}
    },
    loadSaved() {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          this.form = { ...this.form, ...parsed }
        }
      } catch (_) {}
    },
    submit() {
      if (!this.form.host || this.connecting) return
      if (this.rememberMe) {
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            host: this.form.host,
            port: this.form.port,
            username: this.form.username,
          }))
        } catch (_) {}
      }
      this.$emit('connect', { ...this.form })
    },
  },
})
</script>

<style scoped>
.conn-root {
  width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg); position: relative; overflow: hidden;
}

.bg-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,140,66,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,140,66,0.04) 1px, transparent 1px);
  background-size: 40px 40px; pointer-events: none;
}
.bg-glow {
  position: absolute; width: 700px; height: 700px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,140,66,0.07) 0%, transparent 70%);
  top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none;
}

.conn-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  width: 100%; max-width: 420px; padding: 16px; position: relative; z-index: 1;
}

/* Chip art */
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

/* Saved banner */
.saved-banner {
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.2); border-radius: var(--radius-sm);
  font-size: 12px; color: var(--text-dim); cursor: pointer; transition: all 0.15s;
}
.saved-banner:hover { background: rgba(255,140,66,0.2); }
.saved-banner i { color: var(--accent); flex-shrink: 0; }
.saved-banner strong { color: var(--accent); }
.load-hint { margin-left: auto; font-size: 10px; color: var(--accent); opacity: 0.7; }

/* Form card */
.conn-card {
  width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 22px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.error-bar {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 13px; background: var(--red-dim); border: 1px solid rgba(248,113,113,0.22); border-radius: var(--radius-sm);
}
.error-bar > i { color: var(--red); flex-shrink: 0; margin-top: 2px; }
.error-body { display: flex; flex-direction: column; gap: 2px; }
.error-msg { font-size: 12px; color: var(--red); font-weight: 500; }
.error-tip { font-size: 11px; color: var(--text-dim); }

.form-row { display: flex; flex-direction: column; gap: 5px; }
.form-row-group { display: grid; grid-template-columns: 1fr 90px; gap: 10px; }
.form-row label { font-size: 10px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.7px; }

.input-wrap { position: relative; display: flex; align-items: center; }
.input-wrap > i { position: absolute; left: 11px; font-size: 11px; color: var(--text-faint); pointer-events: none; }
.input-wrap input {
  width: 100%; padding: 9px 11px 9px 32px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text); font-size: 13px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; font-family: 'Inter', sans-serif;
}
.input-wrap input::placeholder { color: var(--text-faint); }
.input-wrap input:focus { border-color: rgba(255,140,66,0.4); box-shadow: 0 0 0 3px rgba(255,140,66,0.08); }
.input-wrap input:disabled { opacity: 0.5; cursor: not-allowed; }

.pass-toggle { position: absolute; right: 9px; background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 11px; padding: 4px; transition: color 0.15s; }
.pass-toggle:hover { color: var(--text-dim); }

.optional-badge {
  display: inline-block; margin-left: 6px;
  font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  background: var(--border); color: var(--text-faint); padding: 1px 5px; border-radius: 4px;
}

.field-hint {
  display: flex; align-items: flex-start; gap: 5px;
  font-size: 11px; color: var(--text-faint); margin-top: 4px;
}
.field-hint i { color: var(--blue); font-size: 10px; flex-shrink: 0; margin-top: 1px; }
.field-hint code { background: var(--border); padding: 1px 4px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--accent); }

.remember-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-dim); cursor: pointer; }
.remember-row input { accent-color: var(--accent); }

.connect-btn {
  width: 100%; padding: 12px; background: linear-gradient(135deg, #FF8C42, #E07530); border: none; border-radius: var(--radius-sm);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  box-shadow: 0 4px 18px rgba(255,140,66,0.35); margin-top: 2px;
}
.connect-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(255,140,66,0.45); }
.connect-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spinner {
  width: 13px; height: 13px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  animation: spin 0.7s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Help section */
.help-section {
  width: 100%; font-size: 12px;
}
.help-section summary {
  cursor: pointer; color: var(--text-dim); display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm);
  list-style: none; transition: background 0.15s;
}
.help-section summary:hover { background: var(--card2); }
.help-section summary i { color: var(--accent); font-size: 11px; }
.help-body { padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 var(--radius-sm) var(--radius-sm); display: flex; flex-direction: column; gap: 7px; }
.help-item { display: flex; align-items: flex-start; gap: 7px; color: var(--text-dim); font-size: 11px; }
.help-item i { color: var(--green); font-size: 10px; margin-top: 1px; flex-shrink: 0; }
.help-item code { background: var(--border); padding: 1px 5px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--accent); }

.specs-row { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.spec-chip { display: flex; align-items: center; gap: 4px; padding: 3px 9px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; font-size: 10px; color: var(--text-dim); }
.spec-chip i { font-size: 9px; color: var(--accent); }
</style>
