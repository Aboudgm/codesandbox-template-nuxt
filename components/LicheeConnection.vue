<template>
  <div class="conn-root">
    <!-- Animated background grid -->
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>

    <div class="conn-wrap">
      <!-- Chip illustration -->
      <div class="chip-art">
        <div class="chip-body">
          <div class="chip-pins chip-pins-top">
            <span v-for="i in 14" :key="'t'+i" class="chip-pin" :style="{ animationDelay: (i * 0.08) + 's' }"></span>
          </div>
          <div class="chip-core">
            <div class="chip-label">SG2002</div>
            <div class="chip-sublabel">RISC-V · ARM · NPU</div>
            <div class="chip-icon"><i class="fas fa-microchip"></i></div>
            <div class="chip-specs">
              <span>256MB DDR3</span>
              <span>1 TOPS</span>
            </div>
          </div>
          <div class="chip-pins chip-pins-bottom">
            <span v-for="i in 14" :key="'b'+i" class="chip-pin" :style="{ animationDelay: (i * 0.06 + 0.5) + 's' }"></span>
          </div>
        </div>
      </div>

      <!-- Title -->
      <div class="conn-header">
        <h1 class="conn-title">LicheeRV <span>Nano</span></h1>
        <p class="conn-subtitle">Device Dashboard Interface</p>
      </div>

      <!-- Form card -->
      <div class="conn-card">
        <div v-if="error" class="error-bar">
          <i class="fas fa-exclamation-triangle"></i>
          {{ error }}
        </div>

        <div class="form-row">
          <label class="form-label">IP Address</label>
          <div class="input-wrap">
            <i class="fas fa-network-wired input-icon"></i>
            <input
              v-model="form.host"
              class="form-input"
              type="text"
              placeholder="192.168.1.x"
              :disabled="connecting"
              @keyup.enter="submit"
            />
          </div>
        </div>

        <div class="form-row-group">
          <div class="form-row">
            <label class="form-label">Username</label>
            <div class="input-wrap">
              <i class="fas fa-user input-icon"></i>
              <input
                v-model="form.username"
                class="form-input"
                type="text"
                placeholder="root"
                :disabled="connecting"
                @keyup.enter="submit"
              />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">Port</label>
            <div class="input-wrap">
              <i class="fas fa-hashtag input-icon"></i>
              <input
                v-model="form.port"
                class="form-input"
                type="number"
                placeholder="22"
                :disabled="connecting"
                @keyup.enter="submit"
              />
            </div>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">Password</label>
          <div class="input-wrap">
            <i class="fas fa-lock input-icon"></i>
            <input
              v-model="form.password"
              class="form-input"
              :type="showPass ? 'text' : 'password'"
              placeholder="••••••••"
              :disabled="connecting"
              @keyup.enter="submit"
            />
            <button class="pass-toggle" type="button" @click="showPass = !showPass">
              <i :class="showPass ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
        </div>

        <button class="connect-btn" :disabled="connecting || !form.host" @click="submit">
          <span v-if="!connecting" class="btn-content">
            <i class="fas fa-bolt"></i>
            Connect to Device
          </span>
          <span v-else class="btn-content">
            <span class="spinner"></span>
            Connecting...
          </span>
        </button>
      </div>

      <!-- Specs footer -->
      <div class="specs-row">
        <span class="spec-tag"><i class="fas fa-microchip"></i> SG2002</span>
        <span class="spec-tag"><i class="fas fa-memory"></i> 256MB DDR3</span>
        <span class="spec-tag"><i class="fas fa-ethernet"></i> 100 Mbps</span>
        <span class="spec-tag"><i class="fas fa-brain"></i> 1 TOPS NPU</span>
        <span class="spec-tag"><i class="fab fa-linux"></i> Linux</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'LicheeConnection',
  props: {
    connecting: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  data() {
    return {
      showPass: false,
      form: {
        host: '',
        port: 22,
        username: 'root',
        password: '',
      },
    }
  },
  methods: {
    submit() {
      if (!this.form.host || this.connecting) return
      this.$emit('connect', { ...this.form })
    },
  },
})
</script>

<style scoped>
.conn-root {
  width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg);
  position: relative; overflow: hidden;
}

/* Background effects */
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,140,66,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,140,66,0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
.bg-glow {
  position: absolute;
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,140,66,0.08) 0%, transparent 70%);
  top: 50%; left: 50%; transform: translate(-50%,-50%);
  pointer-events: none;
}

.conn-wrap {
  display: flex; flex-direction: column; align-items: center;
  gap: 20px; width: 100%; max-width: 420px;
  padding: 20px;
  position: relative; z-index: 1;
}

/* Chip art */
.chip-art { display: flex; align-items: center; justify-content: center; }
.chip-body {
  display: flex; flex-direction: column; align-items: center;
  gap: 0;
}
.chip-pins {
  display: flex; gap: 6px; padding: 0 12px;
}
.chip-pin {
  width: 8px; height: 14px;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0;
  animation: pin-appear 0.4s ease forwards, pin-pulse 3s ease-in-out infinite;
}
@keyframes pin-appear {
  to { opacity: 0.7; }
}
@keyframes pin-pulse {
  0%, 100% { opacity: 0.6; background: var(--accent); }
  50% { opacity: 1; background: var(--accent-hover); box-shadow: 0 0 4px var(--accent-glow); }
}
.chip-core {
  background: linear-gradient(135deg, var(--card2) 0%, var(--card) 100%);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 16px 32px;
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; min-width: 220px;
  box-shadow: 0 0 30px rgba(255,140,66,0.12), inset 0 1px 0 rgba(255,255,255,0.05);
}
.chip-label { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: 2px; }
.chip-sublabel { font-size: 9px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; }
.chip-icon { font-size: 22px; color: var(--accent); margin: 6px 0; text-shadow: 0 0 12px var(--accent-glow); }
.chip-specs { display: flex; gap: 12px; }
.chip-specs span { font-size: 9px; color: var(--text-faint); letter-spacing: 0.5px; background: var(--border); padding: 2px 6px; border-radius: 4px; }

/* Title */
.conn-header { text-align: center; }
.conn-title { font-size: 26px; font-weight: 700; color: var(--text); letter-spacing: -0.5px; }
.conn-title span { color: var(--accent); }
.conn-subtitle { font-size: 12px; color: var(--text-dim); margin-top: 3px; letter-spacing: 0.5px; }

/* Form */
.conn-card {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,140,66,0.05);
}

.error-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  background: var(--red-dim);
  border: 1px solid rgba(248,113,113,0.25);
  border-radius: var(--radius-sm);
  font-size: 13px; color: var(--red);
}

.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row-group { display: grid; grid-template-columns: 1fr 100px; gap: 12px; }
.form-label { font-size: 11px; font-weight: 500; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.8px; }

.input-wrap { position: relative; display: flex; align-items: center; }
.input-icon {
  position: absolute; left: 12px; font-size: 12px; color: var(--text-faint); pointer-events: none;
}
.form-input {
  width: 100%; padding: 10px 12px 10px 34px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 13px; font-family: 'Inter', sans-serif;
  outline: none; transition: border-color 0.15s, box-shadow 0.15s;
}
.form-input::placeholder { color: var(--text-faint); }
.form-input:focus { border-color: rgba(255,140,66,0.4); box-shadow: 0 0 0 3px rgba(255,140,66,0.08); }
.form-input:disabled { opacity: 0.5; cursor: not-allowed; }

.pass-toggle {
  position: absolute; right: 10px;
  background: none; border: none; cursor: pointer;
  color: var(--text-faint); font-size: 12px;
  padding: 4px; transition: color 0.15s;
}
.pass-toggle:hover { color: var(--text-dim); }

.connect-btn {
  width: 100%; padding: 13px;
  background: linear-gradient(135deg, var(--accent) 0%, #E07530 100%);
  border: none; border-radius: var(--radius-sm);
  color: #fff; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
  box-shadow: 0 4px 20px rgba(255,140,66,0.35);
  margin-top: 4px;
}
.connect-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(255,140,66,0.45); }
.connect-btn:active:not(:disabled) { transform: translateY(0); }
.connect-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-content { display: flex; align-items: center; justify-content: center; gap: 8px; }

.spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Specs */
.specs-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.spec-tag {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 10px; color: var(--text-dim);
}
.spec-tag i { font-size: 9px; color: var(--accent); }
</style>
