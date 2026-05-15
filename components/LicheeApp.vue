<template>
  <div class="lichee-root">
    <!-- Connection Screen -->
    <LicheeConnection
      v-if="!connected"
      :connecting="connecting"
      :error="connectError"
      @connect="onConnect"
    />

    <!-- Main Dashboard -->
    <div v-else class="app-layout">
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
          <span class="status-dot"></span>
          <div class="device-info">
            <span class="device-host">{{ deviceInfo.hostname || deviceInfo.host }}</span>
            <span class="device-ip">{{ deviceInfo.host }}</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <button
            v-for="p in panels"
            :key="p.id"
            :class="['nav-btn', { active: activePanel === p.id }]"
            @click="activePanel = p.id"
          >
            <i :class="['nav-icon', p.icon]"></i>
            <span class="nav-label">{{ p.label }}</span>
            <span v-if="activePanel === p.id" class="nav-pip"></span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="uptime-info">
            <i class="fas fa-clock"></i>
            <span>{{ shortUptime }}</span>
          </div>
          <button class="disconnect-btn" @click="disconnect">
            <i class="fas fa-power-off"></i>
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      <!-- Content Area -->
      <main class="main-content">
        <div class="panel-header">
          <div class="panel-title">
            <i :class="currentPanel.icon"></i>
            <span>{{ currentPanel.label }}</span>
          </div>
          <div class="panel-actions">
            <span class="conn-badge">
              <span class="conn-dot"></span>
              Connected · {{ deviceInfo.username }}@{{ deviceInfo.host }}
            </span>
          </div>
        </div>

        <div class="panel-body">
          <LicheeDashboard
            v-if="activePanel === 'dashboard'"
            :socket-id="socketId"
            @uptime="val => shortUptime = val"
            @hostname="val => deviceInfo.hostname = val"
          />
          <LicheeTerminal v-if="activePanel === 'terminal'" :socket="socket" />
          <LicheeFiles v-if="activePanel === 'files'" :socket-id="socketId" />
          <LicheeProcesses v-if="activePanel === 'processes'" :socket-id="socketId" />
          <LicheeNetwork v-if="activePanel === 'network'" :socket-id="socketId" />
          <LicheeGPIO v-if="activePanel === 'gpio'" :socket-id="socketId" />
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import io from 'socket.io-client'

export default Vue.extend({
  name: 'LicheeApp',
  data() {
    return {
      connected: false,
      connecting: false,
      connectError: '',
      socket: null as any,
      socketId: '',
      deviceInfo: { host: '', username: 'root', hostname: '' },
      activePanel: 'dashboard',
      shortUptime: '...',
      panels: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { id: 'terminal', label: 'Terminal', icon: 'fas fa-terminal' },
        { id: 'files', label: 'Files', icon: 'fas fa-folder-open' },
        { id: 'processes', label: 'Processes', icon: 'fas fa-tasks' },
        { id: 'network', label: 'Network', icon: 'fas fa-network-wired' },
        { id: 'gpio', label: 'GPIO', icon: 'fas fa-plug' },
      ],
    }
  },
  computed: {
    currentPanel(): any {
      return this.panels.find((p: any) => p.id === this.activePanel) || this.panels[0]
    },
  },
  methods: {
    onConnect({ host, port, username, password }: any) {
      this.connecting = true
      this.connectError = ''

      const socket = io('/', { transports: ['websocket', 'polling'] })

      socket.on('connect', () => {
        this.socket = socket
        this.socketId = socket.id
        socket.emit('ssh:connect', { host, port, username, password })
      })

      socket.on('ssh:ready', ({ host: h, username: u }: any) => {
        this.deviceInfo.host = h || host
        this.deviceInfo.username = u || username
        this.connecting = false
        this.connected = true
      })

      socket.on('ssh:error', (msg: string) => {
        this.connectError = msg || 'Connection failed'
        this.connecting = false
        socket.disconnect()
      })

      socket.on('ssh:closed', () => {
        if (this.connected) {
          this.connected = false
          this.connectError = 'Connection closed by device'
        }
        this.connecting = false
      })

      socket.on('connect_error', () => {
        this.connectError = 'Could not connect to server'
        this.connecting = false
      })
    },
    disconnect() {
      if (this.socket) {
        this.socket.emit('ssh:disconnect')
        this.socket.disconnect()
        this.socket = null
      }
      this.connected = false
      this.socketId = ''
      this.connectError = ''
      this.deviceInfo = { host: '', username: 'root', hostname: '' }
      this.shortUptime = '...'
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
  --accent-dim: rgba(255, 140, 66, 0.18);
  --accent-glow: rgba(255, 140, 66, 0.35);
  --accent-hover: #FF9F5E;

  --text: #EDE8DE;
  --text-dim: #9A8C80;
  --text-faint: #5A5050;

  --green: #5EEAD4;
  --green-dim: rgba(94, 234, 212, 0.15);
  --yellow: #FBBF24;
  --yellow-dim: rgba(251, 191, 36, 0.15);
  --red: #F87171;
  --red-dim: rgba(248, 113, 113, 0.15);
  --blue: #7CB0E8;
  --blue-dim: rgba(124, 176, 232, 0.15);

  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
}

html, body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; height: 100%; overflow: hidden; }
#__nuxt, #__layout { height: 100%; }

.lichee-root { height: 100vh; display: flex; background: var(--bg); overflow: hidden; }

/* ========= APP LAYOUT ========= */
.app-layout { display: flex; width: 100%; height: 100vh; overflow: hidden; }

/* ========= SIDEBAR ========= */
.sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
}
.brand-icon {
  width: 36px; height: 36px;
  background: var(--accent-dim);
  border: 1px solid var(--accent-glow);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  font-size: 16px;
  box-shadow: 0 0 16px var(--accent-glow);
}
.brand-text { display: flex; flex-direction: column; line-height: 1.2; }
.brand-name { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: 0.3px; }
.brand-sub { font-size: 11px; font-weight: 400; color: var(--accent); letter-spacing: 1.5px; text-transform: uppercase; }

.device-badge {
  display: flex; align-items: center; gap: 10px;
  margin: 12px 14px;
  padding: 10px 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 8px var(--green);
  animation: pulse-dot 2s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--green); }
  50% { opacity: 0.6; box-shadow: 0 0 4px var(--green); }
}
.device-info { display: flex; flex-direction: column; min-width: 0; }
.device-host { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.device-ip { font-size: 10px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }

.sidebar-nav { flex: 1; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }

.nav-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none; cursor: pointer;
  color: var(--text-dim);
  font-size: 13px; font-weight: 500;
  transition: all 0.15s ease;
  position: relative;
  text-align: left; width: 100%;
}
.nav-btn:hover { background: var(--card); color: var(--text); }
.nav-btn.active { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(255,140,66,0.2); }
.nav-icon { width: 16px; font-size: 13px; flex-shrink: 0; }
.nav-label { flex: 1; }
.nav-pip {
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent-glow);
}

.sidebar-footer {
  padding: 14px;
  border-top: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 8px;
}
.uptime-info {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--text-faint);
  padding: 0 2px;
}
.uptime-info i { font-size: 10px; color: var(--text-faint); }
.disconnect-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 9px;
  background: var(--red-dim);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: var(--radius-sm);
  color: var(--red);
  font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.disconnect-btn:hover { background: rgba(248,113,113,0.25); }

/* ========= MAIN CONTENT ========= */
.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.panel-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: var(--text); }
.panel-title i { color: var(--accent); font-size: 14px; }

.conn-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 12px;
  background: var(--green-dim);
  border: 1px solid rgba(94,234,212,0.2);
  border-radius: 20px;
  font-size: 11px; color: var(--green);
  font-family: 'JetBrains Mono', monospace;
}
.conn-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

.panel-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 24px;
  background: var(--bg);
}

/* ========= SCROLLBAR ========= */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-faint); }
</style>
