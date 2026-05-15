<template>
  <div class="net-panel">
    <div class="net-toolbar">
      <span class="net-title"><i class="fas fa-network-wired"></i> Network</span>
      <button class="toolbar-btn" @click="refresh"><i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> Refresh</button>
    </div>

    <!-- Interfaces -->
    <div class="section-label">Interfaces</div>
    <div v-if="loading && !interfaces.length" class="net-loading"><i class="fas fa-circle-notch fa-spin"></i></div>
    <div v-else class="iface-grid">
      <div
        v-for="iface in interfaces"
        :key="iface.name"
        :class="['iface-card', { 'iface-up': iface.up, 'iface-down': !iface.up }]"
      >
        <div class="iface-header">
          <span class="iface-name"><i :class="ifaceIcon(iface.name)"></i> {{ iface.name }}</span>
          <span :class="['iface-status', iface.up ? 'up' : 'down']">{{ iface.state || (iface.up ? 'UP' : 'DOWN') }}</span>
        </div>
        <div class="iface-body">
          <div class="iface-field">
            <span class="field-key">IPv4</span>
            <span class="field-val mono">{{ iface.ip || '—' }}</span>
          </div>
          <div class="iface-field">
            <span class="field-key">MAC</span>
            <span class="field-val mono">{{ iface.mac || '—' }}</span>
          </div>
          <div v-if="stats[iface.name]" class="iface-field">
            <span class="field-key">RX</span>
            <span class="field-val mono">{{ stats[iface.name].rx }}</span>
          </div>
          <div v-if="stats[iface.name]" class="iface-field">
            <span class="field-key">TX</span>
            <span class="field-val mono">{{ stats[iface.name].tx }}</span>
          </div>
        </div>
      </div>
      <div v-if="!interfaces.length && !loading" class="iface-card iface-empty">
        <i class="fas fa-unlink"></i> No interfaces found
      </div>
    </div>

    <!-- Route table -->
    <div class="section-label">Routing Table</div>
    <div class="routes-card">
      <pre class="routes-pre">{{ routes || 'Loading...' }}</pre>
    </div>

    <!-- Raw ip addr output -->
    <div class="section-label">Raw <code>ip addr</code></div>
    <div class="routes-card">
      <pre class="routes-pre">{{ rawIpAddr || 'Loading...' }}</pre>
    </div>

    <!-- Connectivity test -->
    <div class="section-label">Connectivity Test</div>
    <div class="ping-card">
      <div class="ping-input-row">
        <input v-model="pingTarget" class="ping-input" placeholder="8.8.8.8 or hostname" @keyup.enter="ping" />
        <button class="ping-btn" :disabled="pinging" @click="ping">
          <i class="fas fa-satellite-dish"></i> {{ pinging ? 'Testing...' : 'Ping' }}
        </button>
      </div>
      <div v-if="pingResult" class="ping-result">
        <pre class="routes-pre">{{ pingResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'LicheeNetwork',
  props: { socketId: { type: String, required: true } },
  data() {
    return {
      interfaces: [] as any[],
      routes: '',
      rawIpAddr: '',
      stats: {} as any,
      loading: false,
      pingTarget: '8.8.8.8',
      pingResult: '',
      pinging: false,
    }
  },
  mounted() { this.refresh() },
  methods: {
    async refresh() {
      this.loading = true
      try {
        const data = await this.$axios.$get('/api/network', {
          headers: { 'x-socket-id': this.socketId },
        })
        this.interfaces = data.interfaces || []
        this.routes = data.routes || ''
        this.stats = data.stats || {}

        const raw = await this.$axios.$post(
          '/api/exec',
          { command: 'ip addr 2>/dev/null || ifconfig 2>/dev/null' },
          { headers: { 'x-socket-id': this.socketId } }
        )
        this.rawIpAddr = raw.output || ''
      } catch (_) {}
      this.loading = false
    },
    async ping() {
      if (this.pinging || !this.pingTarget) return
      this.pinging = true
      this.pingResult = ''
      const target = this.pingTarget.replace(/[;&|`$]/g, '')
      try {
        const data = await this.$axios.$post(
          '/api/exec',
          { command: `ping -c 4 -W 2 ${target} 2>&1` },
          { headers: { 'x-socket-id': this.socketId } }
        )
        this.pingResult = data.output || '(no output)'
      } catch (e: any) {
        this.pingResult = e.message || 'Error'
      }
      this.pinging = false
    },
    ifaceIcon(name: string) {
      if (name.startsWith('eth') || name.startsWith('en')) return 'fas fa-ethernet'
      if (name.startsWith('wlan') || name.startsWith('wl')) return 'fas fa-wifi'
      if (name.startsWith('lo')) return 'fas fa-arrows-alt-h'
      if (name.startsWith('usb') || name.startsWith('rndis')) return 'fab fa-usb'
      return 'fas fa-plug'
    },
  },
})
</script>

<style scoped>
.net-panel { display: flex; flex-direction: column; gap: 14px; }

.net-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
}
.net-title { font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; }
.net-title i { color: var(--accent); }
.toolbar-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-dim); font-size: 12px; padding: 6px 12px; cursor: pointer; transition: all 0.15s;
}
.toolbar-btn:hover { background: var(--accent-dim); color: var(--accent); border-color: rgba(255,140,66,0.2); }

.section-label {
  font-size: 11px; font-weight: 600; color: var(--text-faint);
  text-transform: uppercase; letter-spacing: 0.8px;
  padding: 0 2px;
}
.net-loading { color: var(--text-faint); font-size: 13px; padding: 20px; text-align: center; }

.iface-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }

.iface-card {
  background: var(--card); border-radius: var(--radius);
  overflow: hidden; border: 1px solid var(--border);
  transition: border-color 0.2s;
}
.iface-card.iface-up { border-top: 2px solid var(--green); }
.iface-card.iface-down { border-top: 2px solid var(--border2); opacity: 0.7; }
.iface-empty {
  display: flex; align-items: center; gap: 8px;
  padding: 20px; font-size: 12px; color: var(--text-faint);
}

.iface-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--card2); border-bottom: 1px solid var(--border);
}
.iface-name { font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 7px; }
.iface-name i { color: var(--accent); font-size: 12px; }
.iface-status {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.iface-status.up { background: var(--green-dim); color: var(--green); }
.iface-status.down { background: var(--red-dim); color: var(--red); }

.iface-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 7px; }
.iface-field { display: flex; gap: 8px; align-items: baseline; }
.field-key { font-size: 10px; color: var(--text-faint); min-width: 36px; text-transform: uppercase; }
.field-val { font-size: 11px; color: var(--text); }
.mono { font-family: 'JetBrains Mono', monospace; }

.routes-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;
}
.routes-pre {
  padding: 14px; font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--text-dim);
  white-space: pre-wrap; word-break: break-all;
  max-height: 200px; overflow-y: auto; margin: 0;
}

.ping-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px;
  display: flex; flex-direction: column; gap: 12px;
}
.ping-input-row { display: flex; gap: 8px; }
.ping-input {
  flex: 1; background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); font-size: 12px; padding: 8px 12px; outline: none;
  font-family: 'JetBrains Mono', monospace; transition: border-color 0.15s;
}
.ping-input:focus { border-color: rgba(255,140,66,0.3); }
.ping-input::placeholder { color: var(--text-faint); }
.ping-btn {
  display: flex; align-items: center; gap: 7px;
  background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.2); border-radius: 6px;
  color: var(--accent); font-size: 12px; font-weight: 500; padding: 8px 16px; cursor: pointer; transition: all 0.15s;
}
.ping-btn:hover:not(:disabled) { background: rgba(255,140,66,0.25); }
.ping-btn:disabled { opacity: 0.5; cursor: wait; }
.ping-result { border-top: 1px solid var(--border); padding-top: 12px; }
</style>
