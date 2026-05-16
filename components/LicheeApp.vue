<template>
  <div class="lichee-root">
    <!-- Toast notifications -->
    <transition-group tag="div" class="toast-wrap" name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast', `toast-${t.type}`]"
        @click="dismissToast(t.id)"
      >
        <i :class="t.icon"></i>
        <span>{{ t.message }}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
      </div>
    </transition-group>

    <!-- Connection Screen -->
    <LicheeConnection
      v-if="connState === 'idle'"
      :connecting="false"
      :error="connectError"
      @connect="onConnect"
    />

    <!-- Connecting screen -->
    <div v-else-if="connState === 'connecting'" class="splash-connecting">
      <div class="splash-card">
        <div class="splash-logo"><i class="fas fa-microchip"></i></div>
        <div class="splash-title">Connecting to <span>{{ pendingHost }}</span></div>
        <div class="splash-dots">
          <span></span><span></span><span></span>
        </div>
        <div class="splash-sub">Establishing SSH session...</div>
        <button class="splash-cancel" @click="cancelConnect">Cancel</button>
      </div>
    </div>

    <!-- Main Interface (connected / reconnecting / offline) -->
    <div v-else class="app-layout">
      <!-- Offline/Reconnecting Overlay -->
      <transition name="fade-overlay">
        <div v-if="connState === 'reconnecting' || connState === 'offline'" class="offline-overlay">
          <div class="offline-card">
            <div :class="['offline-icon-wrap', connState === 'reconnecting' ? 'pulsing' : 'shaking']">
              <i :class="connState === 'reconnecting' ? 'fas fa-sync-alt fa-spin' : 'fas fa-unlink'"></i>
            </div>
            <h3 class="offline-title">{{ connState === 'reconnecting' ? 'Reconnecting...' : 'Connection Lost' }}</h3>
            <p class="offline-sub">
              {{ connState === 'reconnecting'
                ? `Attempt ${reconnectAttempts} of ${maxReconnectAttempts}`
                : `Could not reach ${deviceInfo.host}` }}
            </p>

            <div v-if="connState === 'reconnecting'" class="reconnect-progress">
              <div class="reconnect-bar">
                <div class="reconnect-fill" :style="{ width: (reconnectAttempts / maxReconnectAttempts * 100) + '%' }"></div>
              </div>
              <div class="reconnect-hint">
                <i class="fas fa-info-circle"></i>
                Make sure the device is powered on and reachable at {{ deviceInfo.host }}
              </div>
            </div>

            <div v-else class="offline-actions">
              <button class="retry-btn" @click="retryConnect">
                <i class="fas fa-redo"></i> Retry Connection
              </button>
              <button class="home-btn" @click="goHome">
                <i class="fas fa-home"></i> Back to Home
              </button>
              <div class="offline-hint">
                <i class="fas fa-lightbulb"></i>
                <span>Check: Is the device powered on? Is the Ethernet cable connected? Can you ping {{ deviceInfo.host }}?</span>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">
            <i class="fas fa-microchip"></i>
          </div>
          <div class="brand-text">
            <span class="brand-name">LicheeRV</span>
            <span class="brand-sub">Nano</span>
          </div>
        </div>

        <div class="device-badge">
          <span :class="['status-dot', connState === 'connected' ? 'online' : 'offline-dot']"></span>
          <div class="device-info">
            <span class="device-host">{{ deviceInfo.hostname || deviceInfo.host }}</span>
            <span class="device-ip">{{ deviceInfo.host }}</span>
          </div>
          <span :class="['conn-quality', qualityClass]" :title="'API latency: ' + latency + 'ms'">
            <i class="fas fa-signal"></i>
          </span>
        </div>

        <!-- Session timer -->
        <div class="session-timer">
          <i class="fas fa-clock"></i>
          <span class="timer-label">Session</span>
          <span class="timer-val">{{ sessionDuration }}</span>
        </div>

        <nav class="sidebar-nav">
          <button
            v-for="(p, idx) in panels"
            :key="p.id"
            :class="['nav-btn', { active: activePanel === p.id }]"
            :title="`${p.label} (${idx + 1})`"
            @click="activePanel = p.id"
          >
            <i :class="['nav-icon', p.icon]"></i>
            <span class="nav-label">{{ p.label }}</span>
            <span class="nav-kbd">{{ idx + 1 }}</span>
            <span v-if="activePanel === p.id" class="nav-pip"></span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <button class="kbd-hint-btn" @click="showKbdHelp = !showKbdHelp">
            <i class="fas fa-keyboard"></i> Shortcuts
          </button>
          <button class="disconnect-btn" @click="disconnect">
            <i class="fas fa-power-off"></i>
            <span>Disconnect</span>
          </button>
        </div>

        <!-- Keyboard shortcuts tooltip -->
        <transition name="slide-up">
          <div v-if="showKbdHelp" class="kbd-help">
            <div class="kbd-title"><i class="fas fa-keyboard"></i> Keyboard Shortcuts</div>
            <div v-for="p in panels" :key="p.id" class="kbd-row">
              <kbd>{{ panels.indexOf(p) + 1 }}</kbd> {{ p.label }}
            </div>
            <div class="kbd-row"><kbd>Esc</kbd> Close / Back</div>
            <div class="kbd-row"><kbd>R</kbd> Refresh current panel</div>
          </div>
        </transition>
      </aside>

      <!-- Content -->
      <main class="main-content">
        <div class="panel-header">
          <div class="panel-title">
            <i :class="currentPanel.icon"></i>
            <span>{{ currentPanel.label }}</span>
          </div>
          <div class="panel-meta">
            <span v-if="lastUpdated" class="updated-badge">
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': refreshing }"></i>
              {{ lastUpdated }}
            </span>
            <span class="conn-badge">
              <span class="conn-dot"></span>
              {{ deviceInfo.username }}@{{ deviceInfo.host }}
            </span>
          </div>
        </div>

        <div class="panel-body">
          <transition name="panel-fade" mode="out-in">
            <LicheeDashboard
              v-if="activePanel === 'dashboard'"
              :key="'dashboard'"
              :socket-id="socketId"
              @uptime="v => deviceInfo.uptime = v"
              @hostname="v => deviceInfo.hostname = v"
              @latency="v => latency = v"
              @refreshing="v => refreshing = v"
              @updated="updateTimestamp"
            />
            <LicheeTerminal
              v-else-if="activePanel === 'terminal'"
              :key="'terminal'"
              :socket="socket"
              :conn-state="connState"
            />
            <LicheeFiles
              v-else-if="activePanel === 'files'"
              :key="'files'"
              :socket-id="socketId"
              @updated="updateTimestamp"
            />
            <LicheeProcesses
              v-else-if="activePanel === 'processes'"
              :key="'processes'"
              :socket-id="socketId"
              @updated="updateTimestamp"
            />
            <LicheeNetwork
              v-else-if="activePanel === 'network'"
              :key="'network'"
              :socket-id="socketId"
              @updated="updateTimestamp"
            />
            <LicheeGPIO
              v-else-if="activePanel === 'gpio'"
              :key="'gpio'"
              :socket-id="socketId"
              @updated="updateTimestamp"
            />
            <LicheePicoClaw
              v-else-if="activePanel === 'picoclaw'"
              :key="'picoclaw'"
              :socket-id="socketId"
              :host="deviceInfo.host"
            />
          </transition>
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import io from 'socket.io-client'

const TOAST_ICONS: Record<string, string> = {
  success: 'fas fa-check-circle',
  error: 'fas fa-exclamation-circle',
  warning: 'fas fa-exclamation-triangle',
  info: 'fas fa-info-circle',
}

export default Vue.extend({
  name: 'LicheeApp',

  provide() {
    return {
      $toast: (message: string, type = 'info') => this.showToast(message, type),
    }
  },

  data() {
    return {
      connState: 'idle' as 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline',
      socket: null as any,
      socketId: '',
      savedCreds: null as any,
      pendingHost: '',
      connectError: '',

      deviceInfo: { host: '', username: 'root', hostname: '', uptime: '' },

      reconnectAttempts: 0,
      maxReconnectAttempts: 5,

      sessionStart: 0,
      sessionDuration: '0s',
      sessionTimer: null as any,

      activePanel: 'dashboard',
      lastUpdated: '',
      refreshing: false,
      latency: 0,

      toasts: [] as any[],
      showKbdHelp: false,

      panels: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { id: 'terminal', label: 'Terminal', icon: 'fas fa-terminal' },
        { id: 'files', label: 'Files', icon: 'fas fa-folder-open' },
        { id: 'processes', label: 'Processes', icon: 'fas fa-tasks' },
        { id: 'network', label: 'Network', icon: 'fas fa-network-wired' },
        { id: 'gpio', label: 'GPIO', icon: 'fas fa-plug' },
        { id: 'picoclaw', label: 'PicoClaw AI', icon: 'fas fa-robot' },
      ],
    }
  },

  computed: {
    currentPanel(): any {
      return this.panels.find((p: any) => p.id === this.activePanel) || this.panels[0]
    },
    qualityClass(): string {
      if (this.connState !== 'connected') return 'q-offline'
      if (this.latency < 100) return 'q-excellent'
      if (this.latency < 300) return 'q-good'
      if (this.latency < 800) return 'q-fair'
      return 'q-poor'
    },
  },

  mounted() {
    window.addEventListener('keydown', this.handleKeyDown)
    // Auto-connect to the fixed local device on startup
    this.onConnect({ host: '192.168.68.63', port: 22, username: 'root', password: '' })
  },

  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeyDown)
    this.clearTimers()
  },

  methods: {
    onConnect(creds: any) {
      this.pendingHost = creds.host
      this.connectError = ''
      this.connState = 'connecting'
      this.savedCreds = creds
      this.initSocket(creds)
    },

    initSocket(creds: any) {
      if (this.socket) {
        this.socket.removeAllListeners()
        this.socket.disconnect()
      }

      const socket = io('/', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 6000,
      })

      socket.on('connect', () => {
        this.socket = socket
        this.socketId = socket.id
        socket.emit('ssh:connect', creds)
      })

      socket.on('ssh:ready', ({ host, username }: any) => {
        this.deviceInfo.host = host || creds.host
        this.deviceInfo.username = username || creds.username
        const wasReconnecting = this.connState === 'reconnecting'
        this.connState = 'connected'
        this.reconnectAttempts = 0

        if (!this.sessionStart) {
          this.sessionStart = Date.now()
          this.startSessionTimer()
        }

        this.showToast(
          wasReconnecting ? `Reconnected to ${creds.host}` : `Connected to ${creds.host}`,
          'success'
        )
      })

      socket.on('ssh:error', (msg: string) => {
        if (this.connState === 'connecting') {
          this.connState = 'idle'
          this.connectError = msg || 'Connection refused. Check IP address and password.'
          this.socket = null
        } else {
          this.showToast('SSH error: ' + msg, 'error')
        }
      })

      socket.on('ssh:closed', () => {
        if (this.connState === 'connected') {
          this.connState = 'reconnecting'
          this.showToast('Connection lost — reconnecting...', 'warning')
        }
      })

      socket.on('disconnect', (reason: string) => {
        if (this.connState === 'connected') {
          this.connState = 'reconnecting'
          if (reason === 'io server disconnect') {
            this.showToast('Server disconnected', 'warning')
          }
        }
      })

      socket.on('reconnect_attempt', (n: number) => {
        this.reconnectAttempts = n
      })

      socket.on('reconnect', () => {
        this.socketId = socket.id
        socket.emit('ssh:connect', creds)
        this.showToast('Socket reconnected, re-establishing SSH...', 'info')
      })

      socket.on('reconnect_failed', () => {
        this.connState = 'offline'
        this.showToast('Could not reconnect after multiple attempts', 'error')
      })

      socket.on('connect_error', () => {
        if (this.connState === 'connecting') {
          this.connState = 'idle'
          this.connectError = 'Could not connect to the dashboard server'
        }
      })
    },

    cancelConnect() {
      if (this.socket) { this.socket.disconnect(); this.socket = null }
      this.connState = 'idle'
      this.connectError = ''
    },

    retryConnect() {
      if (this.savedCreds) {
        this.reconnectAttempts = 0
        this.connState = 'reconnecting'
        this.initSocket(this.savedCreds)
      }
    },

    goHome() {
      this.clearTimers()
      if (this.socket) { this.socket.disconnect(); this.socket = null }
      this.connState = 'idle'
      this.connectError = ''
      this.deviceInfo = { host: '', username: 'root', hostname: '', uptime: '' }
      this.sessionStart = 0
      this.reconnectAttempts = 0
    },

    disconnect() {
      this.clearTimers()
      if (this.socket) {
        this.socket.emit('ssh:disconnect')
        this.socket.disconnect()
        this.socket = null
      }
      this.savedCreds = null
      this.connState = 'idle'
      this.connectError = ''
      this.socketId = ''
      this.sessionStart = 0
      this.deviceInfo = { host: '', username: 'root', hostname: '', uptime: '' }
    },

    startSessionTimer() {
      this.sessionTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000)
        const h = Math.floor(elapsed / 3600)
        const m = Math.floor((elapsed % 3600) / 60)
        const s = elapsed % 60
        this.sessionDuration = h > 0
          ? `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`
          : m > 0 ? `${m}m ${String(s).padStart(2,'0')}s` : `${s}s`
      }, 1000)
    },

    clearTimers() {
      if (this.sessionTimer) { clearInterval(this.sessionTimer); this.sessionTimer = null }
    },

    updateTimestamp() {
      const now = new Date()
      this.lastUpdated = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
    },

    showToast(message: string, type = 'info') {
      const id = Date.now() + Math.random()
      this.toasts.push({ id, message, type, icon: TOAST_ICONS[type] || TOAST_ICONS.info })
      setTimeout(() => this.dismissToast(id), 5000)
    },

    dismissToast(id: number) {
      this.toasts = this.toasts.filter((t: any) => t.id !== id)
    },

    handleKeyDown(e: KeyboardEvent) {
      if (this.connState !== 'connected') return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key >= '1' && e.key <= '7') {
        const idx = parseInt(e.key) - 1
        if (this.panels[idx]) { this.activePanel = this.panels[idx].id; e.preventDefault() }
      }
      if (e.key === 'Escape') { this.showKbdHelp = false }
      if (e.key === 'r' || e.key === 'R') {
        this.showToast('Refreshing ' + this.currentPanel.label, 'info')
      }
    },
  },
})
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0D0B14;
  --surface: #13111C;
  --card: #1A1826;
  --card2: #211E2E;
  --border: #2A2638;
  --border2: #352F48;

  --accent: #FF8C42;
  --accent-dim: rgba(255, 140, 66, 0.15);
  --accent-glow: rgba(255, 140, 66, 0.3);
  --accent-hover: #FF9F5E;

  --text: #EDE8DE;
  --text-dim: #9A8C80;
  --text-faint: #5A5050;

  --green: #5EEAD4;
  --green-dim: rgba(94, 234, 212, 0.12);
  --yellow: #FBBF24;
  --yellow-dim: rgba(251, 191, 36, 0.12);
  --red: #F87171;
  --red-dim: rgba(248, 113, 113, 0.12);
  --blue: #7CB0E8;
  --blue-dim: rgba(124, 176, 232, 0.12);

  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
}

html, body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; height: 100%; overflow: hidden; }
#__nuxt, #__layout { height: 100%; }
.lichee-root { height: 100vh; display: flex; background: var(--bg); overflow: hidden; }

/* ---- TOASTS ---- */
.toast-wrap {
  position: fixed; top: 16px; right: 16px; z-index: 9999;
  display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.toast {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 500;
  pointer-events: auto; cursor: pointer;
  min-width: 260px; max-width: 380px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  border: 1px solid transparent;
}
.toast-success { background: rgba(30,40,35,0.95); border-color: rgba(94,234,212,0.3); color: var(--green); }
.toast-error   { background: rgba(40,20,20,0.95); border-color: rgba(248,113,113,0.3); color: var(--red); }
.toast-warning { background: rgba(40,35,15,0.95); border-color: rgba(251,191,36,0.3);  color: var(--yellow); }
.toast-info    { background: rgba(20,25,40,0.95); border-color: rgba(255,140,66,0.3);  color: var(--accent); }
.toast i:first-child { font-size: 14px; flex-shrink: 0; }
.toast span { flex: 1; }
.toast-close { background: none; border: none; cursor: pointer; color: currentColor; opacity: 0.5; font-size: 10px; padding: 0 2px; }

.toast-enter-active { animation: toast-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { animation: toast-out 0.2s ease forwards; }
@keyframes toast-in { from { opacity: 0; transform: translateX(100%) scale(0.9); } }
@keyframes toast-out { to { opacity: 0; transform: translateX(100%) scale(0.9); } }

/* ---- SPLASH CONNECTING ---- */
.splash-connecting {
  width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg);
}
.splash-card {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 48px 56px; text-align: center;
}
.splash-logo {
  width: 60px; height: 60px; border-radius: 16px;
  background: var(--accent-dim); border: 1px solid var(--accent-glow);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; color: var(--accent);
  box-shadow: 0 0 30px var(--accent-glow);
  animation: pulse-glow 2s ease-in-out infinite;
}
@keyframes pulse-glow {
  0%,100% { box-shadow: 0 0 20px var(--accent-glow); }
  50%      { box-shadow: 0 0 40px rgba(255,140,66,0.5); }
}
.splash-title { font-size: 18px; font-weight: 600; color: var(--text); }
.splash-title span { color: var(--accent); }
.splash-dots { display: flex; gap: 6px; }
.splash-dots span {
  width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
  animation: dot-bounce 1.4s ease infinite;
}
.splash-dots span:nth-child(2) { animation-delay: 0.2s; }
.splash-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
.splash-sub { font-size: 12px; color: var(--text-faint); }
.splash-cancel {
  margin-top: 8px;
  background: none; border: 1px solid var(--border2); border-radius: 6px;
  color: var(--text-dim); font-size: 12px; padding: 6px 16px; cursor: pointer; transition: all 0.15s;
}
.splash-cancel:hover { background: var(--red-dim); border-color: rgba(248,113,113,0.3); color: var(--red); }

/* ---- APP LAYOUT ---- */
.app-layout { display: flex; width: 100%; height: 100vh; overflow: hidden; position: relative; }

/* ---- OFFLINE OVERLAY ---- */
.offline-overlay {
  position: absolute; inset: 0; z-index: 500;
  background: rgba(13,11,20,0.85);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}
.offline-card {
  background: var(--surface); border: 1px solid var(--border2);
  border-radius: var(--radius-lg); padding: 40px 48px;
  text-align: center; max-width: 440px; width: 90%;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.offline-icon-wrap {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px;
}
.offline-icon-wrap.pulsing { background: var(--accent-dim); color: var(--accent); border: 2px solid rgba(255,140,66,0.3); }
.offline-icon-wrap.shaking { background: var(--red-dim); color: var(--red); border: 2px solid rgba(248,113,113,0.3); animation: shake 0.5s ease; }
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}
.offline-title { font-size: 20px; font-weight: 700; color: var(--text); }
.offline-sub { font-size: 13px; color: var(--text-dim); }
.reconnect-progress { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.reconnect-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.reconnect-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s ease; }
.reconnect-hint { font-size: 11px; color: var(--text-faint); display: flex; align-items: flex-start; gap: 6px; text-align: left; }
.reconnect-hint i { color: var(--blue); flex-shrink: 0; margin-top: 1px; }
.offline-actions { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.retry-btn {
  width: 100%; padding: 11px;
  background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.25); border-radius: var(--radius-sm);
  color: var(--accent); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.retry-btn:hover { background: rgba(255,140,66,0.25); }
.home-btn {
  width: 100%; padding: 9px;
  background: none; border: 1px solid var(--border2); border-radius: var(--radius-sm);
  color: var(--text-dim); font-size: 12px; cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.home-btn:hover { background: var(--card2); }
.offline-hint {
  padding: 10px 12px; background: var(--blue-dim); border: 1px solid rgba(124,176,232,0.15); border-radius: 8px;
  font-size: 11px; color: var(--text-dim); display: flex; align-items: flex-start; gap: 8px; text-align: left;
}
.offline-hint i { color: var(--blue); flex-shrink: 0; margin-top: 2px; }

.fade-overlay-enter-active { animation: fade-in 0.25s ease; }
.fade-overlay-leave-active { animation: fade-out 0.2s ease forwards; }
@keyframes fade-in { from { opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }

/* ---- SIDEBAR ---- */
.sidebar {
  width: 224px; min-width: 224px; background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; overflow: hidden; position: relative; z-index: 10;
}
.sidebar-brand {
  display: flex; align-items: center; gap: 12px;
  padding: 18px 18px 14px; border-bottom: 1px solid var(--border);
}
.brand-icon {
  width: 36px; height: 36px; background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.25);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  color: var(--accent); font-size: 16px; box-shadow: 0 0 14px var(--accent-glow);
}
.brand-text { display: flex; flex-direction: column; line-height: 1.2; }
.brand-name { font-size: 15px; font-weight: 700; color: var(--text); }
.brand-sub { font-size: 10px; color: var(--accent); letter-spacing: 1.5px; text-transform: uppercase; }

.device-badge {
  display: flex; align-items: center; gap: 8px;
  margin: 10px 12px 4px; padding: 9px 10px;
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm);
}
.status-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.status-dot.online { background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse-dot 2s ease infinite; }
.status-dot.offline-dot { background: var(--red); box-shadow: 0 0 8px var(--red); animation: pulse-dot 1s ease infinite; }
@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.device-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.device-host { font-size: 11px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.device-ip { font-size: 10px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }
.conn-quality { font-size: 10px; flex-shrink: 0; cursor: help; }
.q-excellent { color: var(--green); } .q-good { color: #86efac; } .q-fair { color: var(--yellow); } .q-poor { color: var(--red); } .q-offline { color: var(--text-faint); }

.session-timer {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  font-size: 11px; color: var(--text-faint);
  border-bottom: 1px solid var(--border);
}
.session-timer i { font-size: 9px; color: var(--accent); }
.timer-label { color: var(--text-faint); }
.timer-val { font-family: 'JetBrains Mono', monospace; color: var(--text-dim); font-size: 10px; margin-left: auto; }

.sidebar-nav { flex: 1; padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.nav-btn {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; border-radius: var(--radius-sm);
  background: transparent; border: none; cursor: pointer;
  color: var(--text-dim); font-size: 12px; font-weight: 500;
  transition: all 0.13s ease; position: relative; text-align: left; width: 100%;
}
.nav-btn:hover { background: var(--card); color: var(--text); }
.nav-btn.active { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(255,140,66,0.18); }
.nav-icon { width: 14px; font-size: 12px; flex-shrink: 0; }
.nav-label { flex: 1; }
.nav-kbd { font-size: 9px; color: var(--text-faint); background: var(--border); padding: 1px 5px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
.nav-btn.active .nav-kbd { background: rgba(255,140,66,0.2); color: var(--accent); }
.nav-pip { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 6px var(--accent-glow); }

.sidebar-footer { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
.kbd-hint-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 7px; background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-faint); font-size: 11px; cursor: pointer; transition: all 0.15s;
}
.kbd-hint-btn:hover { color: var(--text-dim); background: var(--card); }
.disconnect-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 9px; background: var(--red-dim); border: 1px solid rgba(248,113,113,0.18); border-radius: 6px;
  color: var(--red); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.disconnect-btn:hover { background: rgba(248,113,113,0.22); }

.kbd-help {
  position: absolute; bottom: 140px; left: 12px; right: 12px;
  background: var(--card2); border: 1px solid var(--border2); border-radius: var(--radius-sm);
  padding: 12px; z-index: 20;
}
.kbd-title { font-size: 10px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.kbd-title i { color: var(--accent); }
.kbd-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-dim); padding: 3px 0; }
kbd { background: var(--border2); border: 1px solid var(--border2); border-radius: 4px; padding: 1px 6px; font-size: 10px; font-family: 'JetBrains Mono', monospace; color: var(--text); }

.slide-up-enter-active { animation: slide-up 0.2s ease; }
.slide-up-leave-active { animation: slide-down 0.15s ease forwards; }
@keyframes slide-up { from { opacity: 0; transform: translateY(8px); } }
@keyframes slide-down { to { opacity: 0; transform: translateY(8px); } }

/* ---- MAIN CONTENT ---- */
.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 22px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.panel-title { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; color: var(--text); }
.panel-title i { color: var(--accent); font-size: 13px; }
.panel-meta { display: flex; align-items: center; gap: 10px; }
.updated-badge {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; color: var(--text-faint); font-family: 'JetBrains Mono', monospace;
}
.updated-badge i { font-size: 9px; }
.conn-badge {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; background: var(--green-dim); border: 1px solid rgba(94,234,212,0.18);
  border-radius: 20px; font-size: 10px; color: var(--green); font-family: 'JetBrains Mono', monospace;
}
.conn-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); }
.panel-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 20px 22px; background: var(--bg); }

/* Panel fade transition */
.panel-fade-enter-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.panel-fade-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.panel-fade-enter { opacity: 0; transform: translateY(6px); }
.panel-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* Scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-faint); }
</style>
