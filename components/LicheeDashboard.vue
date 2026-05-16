<template>
  <div class="dashboard">
    <!-- Skeleton on first load -->
    <div v-if="firstLoad" class="stats-grid">
      <div v-for="i in 4" :key="i" class="stat-card skeleton-card">
        <div class="skel skel-label"></div>
        <div class="skel skel-ring"></div>
        <div class="skel skel-bar"></div>
      </div>
    </div>

    <!-- Live stat cards -->
    <div v-else class="stats-grid">
      <!-- CPU -->
      <div class="stat-card" :class="{ 'card-flash': flashing.cpu }">
        <div class="stat-header">
          <span class="stat-label"><i class="fas fa-microchip"></i> CPU</span>
          <div class="stat-right">
            <span class="freq-badge" v-if="stats.cpu.freqMhz">{{ stats.cpu.freqMhz }} MHz</span>
            <span class="live-dot"></span>
          </div>
        </div>
        <div class="ring-wrap">
          <div class="ring" :style="ringStyle(stats.cpu.pct, '#FF8C42')">
            <div class="ring-inner">
              <span class="ring-val">{{ stats.cpu.pct }}</span>
              <span class="ring-unit">%</span>
            </div>
          </div>
        </div>
        <svg class="sparkline" viewBox="0 0 100 22" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cpu-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FF8C42" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#FF8C42" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path :d="filledLine(cpuHistory)" fill="url(#cpu-grad)"/>
          <polyline :points="sparkPoints(cpuHistory)" fill="none" stroke="#FF8C42" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="stat-sub">
          <span>1m: {{ stats.load.one }}</span>
          <span>5m: {{ stats.load.five }}</span>
          <span>15m: {{ stats.load.fifteen }}</span>
        </div>
      </div>

      <!-- Memory -->
      <div class="stat-card" :class="{ 'card-flash': flashing.mem }">
        <div class="stat-header">
          <span class="stat-label"><i class="fas fa-memory"></i> Memory</span>
          <span class="stat-badge">{{ stats.memory.used }}M / {{ stats.memory.total }}M</span>
        </div>
        <div class="ring-wrap">
          <div class="ring" :style="ringStyle(stats.memory.pct, '#7CB0E8')">
            <div class="ring-inner">
              <span class="ring-val">{{ stats.memory.pct }}</span>
              <span class="ring-unit">%</span>
            </div>
          </div>
        </div>
        <svg class="sparkline" viewBox="0 0 100 22" preserveAspectRatio="none">
          <defs>
            <linearGradient id="mem-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7CB0E8" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#7CB0E8" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path :d="filledLine(memHistory)" fill="url(#mem-grad)"/>
          <polyline :points="sparkPoints(memHistory)" fill="none" stroke="#7CB0E8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="stat-sub">
          <span>Free: {{ memFree }}M</span>
          <span>Used: {{ stats.memory.pct }}%</span>
        </div>
      </div>

      <!-- Disk -->
      <div class="stat-card" :class="{ 'card-flash': flashing.disk }">
        <div class="stat-header">
          <span class="stat-label"><i class="fas fa-hdd"></i> Storage</span>
          <span class="stat-badge">{{ stats.disk.used }} / {{ stats.disk.total }}</span>
        </div>
        <div class="ring-wrap">
          <div class="ring" :style="ringStyle(stats.disk.pct, '#5EEAD4')">
            <div class="ring-inner">
              <span class="ring-val">{{ stats.disk.pct }}</span>
              <span class="ring-unit">%</span>
            </div>
          </div>
        </div>
        <div class="disk-bar-wrap">
          <div class="disk-bar">
            <div class="disk-fill" :style="{ width: stats.disk.pct + '%' }"></div>
          </div>
          <div class="disk-labels">
            <span>Used {{ stats.disk.used }}</span>
            <span>Free {{ diskFree }}</span>
          </div>
        </div>
      </div>

      <!-- Temperature -->
      <div class="stat-card" :class="{ 'card-flash': flashing.temp }">
        <div class="stat-header">
          <span class="stat-label"><i class="fas fa-thermometer-half"></i> Temp</span>
          <span :class="['temp-badge', tempClass]">{{ tempLabel }}</span>
        </div>
        <div class="ring-wrap">
          <div class="ring" :style="ringStyle(tempPct, tempColor)">
            <div class="ring-inner">
              <span class="ring-val" :style="{ color: tempColor }">{{ stats.temperature }}</span>
              <span class="ring-unit">°C</span>
            </div>
          </div>
        </div>
        <svg class="sparkline" viewBox="0 0 100 22" preserveAspectRatio="none">
          <defs>
            <linearGradient id="temp-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="tempColor" stop-opacity="0.45"/>
              <stop offset="100%" :stop-color="tempColor" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path :d="filledLine(tempHistory)" fill="url(#temp-grad)"/>
          <polyline :points="sparkPoints(tempHistory)" fill="none" :stroke="tempColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="temp-scale">
          <span class="scale-lo">Cool</span>
          <div class="scale-bar"><div class="scale-cursor" :style="{ left: tempPct + '%' }"></div></div>
          <span class="scale-hi">Hot</span>
        </div>
      </div>
    </div>

    <!-- Network + Info row -->
    <div class="mid-row">
      <!-- Network live traffic -->
      <div class="net-card">
        <div class="card-title">
          <i class="fas fa-network-wired"></i> Network Traffic
          <span class="iface-label">{{ primaryIface }}</span>
        </div>
        <div v-if="firstLoad" class="net-loading">
          <span class="skel skel-net"></span>
        </div>
        <div v-else class="net-body">
          <div class="net-stat">
            <div class="net-dir down"><i class="fas fa-arrow-down"></i> RX</div>
            <div class="net-speed">{{ rxSpeed }}</div>
            <div class="net-total">Total: {{ rxTotal }}</div>
          </div>
          <div class="net-divider"></div>
          <div class="net-stat">
            <div class="net-dir up"><i class="fas fa-arrow-up"></i> TX</div>
            <div class="net-speed">{{ txSpeed }}</div>
            <div class="net-total">Total: {{ txTotal }}</div>
          </div>
        </div>
        <!-- Network sparkline -->
        <svg class="net-sparkline" viewBox="0 0 200 30" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rx-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#5EEAD4" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#5EEAD4" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="tx-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FF8C42" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#FF8C42" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path :d="filledLine(rxHistory, 200, 30)" fill="url(#rx-grad)"/>
          <polyline :points="sparkPoints(rxHistory, 200, 30)" fill="none" stroke="#5EEAD4" stroke-width="1.5" stroke-linecap="round"/>
          <path :d="filledLine(txHistory, 200, 30)" fill="url(#tx-grad)"/>
          <polyline :points="sparkPoints(txHistory, 200, 30)" fill="none" stroke="#FF8C42" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div class="net-legend">
          <span class="legend-item rx"><span class="legend-dot"></span> RX</span>
          <span class="legend-item tx"><span class="legend-dot"></span> TX</span>
        </div>
      </div>

      <!-- System info -->
      <div class="info-card">
        <div class="card-title"><i class="fas fa-server"></i> System Info</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-key">Hostname</span>
            <span class="info-val mono">{{ stats.hostname }}</span>
          </div>
          <div class="info-item">
            <span class="info-key">Uptime</span>
            <span class="info-val mono">{{ stats.uptime }}</span>
          </div>
          <div class="info-item">
            <span class="info-key">Kernel</span>
            <span class="info-val mono">{{ stats.kernel }}</span>
          </div>
          <div class="info-item">
            <span class="info-key">Arch</span>
            <span class="info-val mono">{{ stats.arch }}</span>
          </div>
          <div class="info-item">
            <span class="info-key">SoC</span>
            <span class="info-val mono">SG2002</span>
          </div>
          <div class="info-item">
            <span class="info-key">API Ping</span>
            <span class="info-val mono" :style="{ color: latencyColor }">{{ latency }}ms</span>
          </div>
        </div>
        <div class="hw-chips">
          <span class="hw-chip"><i class="fas fa-microchip"></i> RISC-V C906</span>
          <span class="hw-chip"><i class="fas fa-bolt"></i> 1 TOPS NPU</span>
          <span class="hw-chip"><i class="fas fa-ethernet"></i> 100 Mbps</span>
          <span class="hw-chip"><i class="fas fa-memory"></i> 256MB DDR3</span>
        </div>
      </div>

      <!-- Quick commands -->
      <div class="quick-card">
        <div class="card-title"><i class="fas fa-terminal"></i> Quick Info</div>
        <div class="cmd-grid">
          <button
            v-for="cmd in quickCmds"
            :key="cmd.label"
            class="cmd-btn"
            :class="{ running: runningCmd === cmd.label }"
            :title="cmd.cmd"
            @click="runCmd(cmd)"
          >
            <i :class="cmd.icon"></i>
            {{ cmd.label }}
          </button>
        </div>
        <transition name="slide-output">
          <div v-if="cmdOutput" class="cmd-output">
            <div class="cmd-output-bar">
              <span class="mono accent">$ {{ lastCmd }}</span>
              <button class="tiny-btn" @click="cmdOutput = ''"><i class="fas fa-times"></i></button>
            </div>
            <pre class="cmd-pre">{{ cmdOutput }}</pre>
          </div>
        </transition>
      </div>
    </div>

    <!-- Device Controls -->
    <div class="controls-row">
      <div class="ctrl-card">
        <div class="card-title"><i class="fas fa-power-off"></i> Device Controls</div>
        <div class="ctrl-btns">
          <!-- Reboot -->
          <div class="ctrl-action">
            <button
              class="ctrl-btn reboot-btn"
              :disabled="deviceActionRunning"
              @click="runDeviceAction('reboot')"
            >
              <i class="fas fa-sync-alt"></i>
              <span>{{ confirmAction === 'reboot' ? 'Tap again to confirm' : 'Reboot Device' }}</span>
            </button>
            <p class="ctrl-hint">Safely restart the Nano — it will come back online in ~30 seconds</p>
          </div>
          <!-- Shutdown -->
          <div class="ctrl-action">
            <button
              class="ctrl-btn shutdown-btn"
              :disabled="deviceActionRunning"
              @click="runDeviceAction('shutdown')"
            >
              <i class="fas fa-power-off"></i>
              <span>{{ confirmAction === 'shutdown' ? 'Tap again to confirm' : 'Shutdown Device' }}</span>
            </button>
            <p class="ctrl-hint">Power off the Nano safely — unplug power to turn it back on</p>
          </div>
          <!-- Cancel confirm -->
          <transition name="fade-ctrl">
            <button v-if="confirmAction" class="ctrl-cancel" @click="confirmAction = null">
              <i class="fas fa-times"></i> Cancel
            </button>
          </transition>
        </div>
      </div>
    </div>

    <!-- Activity log -->
    <div class="activity-card">
      <div class="card-title">
        <i class="fas fa-list-alt"></i> Activity Log
        <span class="log-count">{{ activityLog.length }}</span>
        <div class="live-indicator" v-if="!firstLoad">
          <span class="live-dot-a"></span><span class="live-dot-a"></span><span class="live-dot-a"></span>
          <span class="live-label">LIVE</span>
        </div>
        <button class="tiny-btn ml-auto" @click="activityLog = []"><i class="fas fa-trash-alt"></i></button>
      </div>
      <div class="activity-log">
        <div v-if="!activityLog.length" class="log-empty">
          <i class="fas fa-circle-notch fa-spin"></i> Awaiting data...
        </div>
        <transition-group name="log-entry" tag="div">
          <div v-for="(e, i) in activityLog.slice().reverse().slice(0, 30)" :key="e.id" class="log-row">
            <span class="log-time">{{ e.time }}</span>
            <span :class="['log-type', e.type]">{{ e.type }}</span>
            <span class="log-msg">{{ e.msg }}</span>
          </div>
        </transition-group>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

const HISTORY_LEN = 30

const defaultStats = () => ({
  cpu: { pct: 0, load: '0.00', freqMhz: 0 },
  memory: { used: 0, total: 256, pct: 0 },
  disk: { used: '?', total: '?', pct: 0 },
  temperature: 0,
  uptime: '...',
  load: { one: '0.00', five: '0.00', fifteen: '0.00' },
  hostname: '...',
  kernel: '...',
  arch: 'riscv64',
  netStats: {} as any,
})

function formatSpeed(bps: number): string {
  if (bps < 1024) return bps.toFixed(0) + ' B/s'
  if (bps < 1024 * 1024) return (bps / 1024).toFixed(1) + ' KB/s'
  return (bps / 1024 / 1024).toFixed(2) + ' MB/s'
}

export default Vue.extend({
  name: 'LicheeDashboard',
  inject: ['$toast'],
  props: { socketId: { type: String, required: true } },
  data() {
    return {
      stats: defaultStats() as any,
      firstLoad: true,
      timer: null as any,
      latency: 0,

      cpuHistory: [] as number[],
      memHistory: [] as number[],
      tempHistory: [] as number[],
      rxHistory: [] as number[],
      txHistory: [] as number[],

      prevNetStats: {} as any,
      prevNetTime: 0,

      rxSpeed: '0 B/s',
      txSpeed: '0 B/s',
      rxTotal: '0 B',
      txTotal: '0 B',
      primaryIface: 'eth0',

      flashing: { cpu: false, mem: false, disk: false, temp: false },

      activityLog: [] as any[],
      logSeq: 0,

      cmdOutput: '',
      lastCmd: '',
      runningCmd: '',
      quickCmds: [
        { label: 'Disk Space',    icon: 'fas fa-hdd',           cmd: 'df -h' },
        { label: 'Memory Info',   icon: 'fas fa-memory',        cmd: 'free -h' },
        { label: 'Network Info',  icon: 'fas fa-network-wired', cmd: 'ip addr' },
        { label: 'Running Apps',  icon: 'fas fa-tasks',         cmd: 'ps aux | head -20' },
        { label: 'System Info',   icon: 'fas fa-info-circle',   cmd: 'uname -a && cat /etc/os-release 2>/dev/null | head -6' },
        { label: 'CPU Details',   icon: 'fas fa-microchip',     cmd: 'lscpu 2>/dev/null || cat /proc/cpuinfo | head -20' },
        { label: 'Uptime',        icon: 'fas fa-clock',         cmd: 'uptime' },
        { label: 'System Logs',   icon: 'fas fa-scroll',        cmd: 'dmesg | tail -20' },
      ],

      // Device control
      confirmAction: null as string | null,
      deviceActionRunning: false,
    }
  },
  computed: {
    tempPct(): number { return Math.min(100, (this.stats.temperature / 100) * 100) },
    tempColor(): string {
      const t = this.stats.temperature
      if (t < 50) return '#5EEAD4'; if (t < 70) return '#FBBF24'; return '#F87171'
    },
    tempClass(): string {
      const t = this.stats.temperature
      if (t < 50) return 'badge-cool'; if (t < 70) return 'badge-warm'; return 'badge-hot'
    },
    tempLabel(): string {
      const t = this.stats.temperature
      if (t < 50) return 'Cool'; if (t < 70) return 'Warm'; return 'Hot!'
    },
    memFree(): number {
      return Math.max(0, this.stats.memory.total - this.stats.memory.used)
    },
    diskFree(): string {
      // Rough calculation from disk total string
      const total = parseFloat(this.stats.disk.total) || 0
      const used = parseFloat(this.stats.disk.used) || 0
      const unit = (this.stats.disk.total || 'G').replace(/[\d.]/g, '')
      return (Math.max(0, total - used)).toFixed(1) + unit
    },
    latencyColor(): string {
      if (this.latency < 100) return '#5EEAD4'
      if (this.latency < 300) return '#FBBF24'
      return '#F87171'
    },
  },
  mounted() {
    this.fetchStats()
    this.timer = setInterval(this.fetchStats, 4000)
  },
  beforeDestroy() { clearInterval(this.timer) },
  methods: {
    ringStyle(pct: number, color: string) {
      const p = Math.min(100, Math.max(0, pct))
      return {
        background: `conic-gradient(${color} 0% ${p}%, var(--card2) ${p}% 100%)`,
        boxShadow: `0 0 16px ${color}28`,
      }
    },

    sparkPoints(history: number[], w = 100, h = 22): string {
      if (history.length < 2) return ''
      const max = Math.max(...history, 1)
      return history
        .map((v, i) => {
          const x = (i / (history.length - 1)) * w
          const y = h - 2 - ((v / max) * (h - 4))
          return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
    },

    filledLine(history: number[], w = 100, h = 22): string {
      if (history.length < 2) return ''
      const max = Math.max(...history, 1)
      const pts = history.map((v, i) => {
        const x = (i / (history.length - 1)) * w
        const y = h - 2 - ((v / max) * (h - 4))
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      return `M0,${h} L${pts.join(' L')} L${w},${h} Z`
    },

    pushHistory(arr: number[], val: number) {
      arr.push(val)
      if (arr.length > HISTORY_LEN) arr.shift()
    },

    flash(key: 'cpu' | 'mem' | 'disk' | 'temp') {
      (this.flashing as any)[key] = true
      setTimeout(() => { (this.flashing as any)[key] = false }, 600)
    },

    async fetchStats() {
      const t0 = Date.now()
      this.$emit('refreshing', true)
      try {
        const data = await this.$axios.$get('/api/stats', {
          headers: { 'x-socket-id': this.socketId },
        })
        this.latency = Date.now() - t0
        this.$emit('latency', this.latency)

        // Flash cards when values change significantly
        if (Math.abs((data.cpu?.pct || 0) - this.stats.cpu.pct) > 5) this.flash('cpu')
        if (Math.abs((data.memory?.pct || 0) - this.stats.memory.pct) > 3) this.flash('mem')
        if (Math.abs((data.temperature || 0) - this.stats.temperature) > 2) this.flash('temp')

        this.stats = data

        // Update history
        this.pushHistory(this.cpuHistory, data.cpu?.pct || 0)
        this.pushHistory(this.memHistory, data.memory?.pct || 0)
        this.pushHistory(this.tempHistory, data.temperature || 0)

        // Network speed delta
        this.updateNetworkSpeed(data.netStats || {})

        this.$emit('uptime', data.uptime || '')
        this.$emit('hostname', data.hostname || '')
        this.$emit('updated')

        if (this.firstLoad) this.firstLoad = false

        this.log('stats', `CPU ${data.cpu?.pct}% · RAM ${data.memory?.pct}% · ${data.temperature}°C · ${this.rxSpeed} ↓`)
      } catch (err: any) {
        this.latency = Date.now() - t0
        if (!this.firstLoad) {
          this.log('error', 'Failed to fetch stats')
        }
      }
      this.$emit('refreshing', false)
    },

    updateNetworkSpeed(netStats: any) {
      const now = Date.now()
      const elapsed = this.prevNetTime ? (now - this.prevNetTime) / 1000 : 0

      // Pick primary interface (eth0 > en* > wlan0 > first)
      const ifaces = Object.keys(netStats)
      const primary = ifaces.find(i => i.startsWith('eth')) || ifaces.find(i => i.startsWith('en')) || ifaces[0]
      if (!primary) return
      this.primaryIface = primary

      const curr = netStats[primary]
      const prev = this.prevNetStats[primary]

      if (prev && elapsed > 0.5) {
        const rxBps = Math.max(0, (curr.rxBytes - prev.rxBytes) / elapsed)
        const txBps = Math.max(0, (curr.txBytes - prev.txBytes) / elapsed)
        this.rxSpeed = formatSpeed(rxBps)
        this.txSpeed = formatSpeed(txBps)
        this.pushHistory(this.rxHistory, rxBps)
        this.pushHistory(this.txHistory, txBps)
      }

      this.rxTotal = curr?.rx || '0 B'
      this.txTotal = curr?.tx || '0 B'
      this.prevNetStats = netStats
      this.prevNetTime = now
    },

    async runCmd(cmd: any) {
      if (this.runningCmd) return
      this.runningCmd = cmd.label
      this.lastCmd = cmd.cmd
      try {
        const data = await this.$axios.$post(
          '/api/exec',
          { command: cmd.cmd },
          { headers: { 'x-socket-id': this.socketId } }
        )
        this.cmdOutput = data.output || '(no output)'
        this.log('cmd', cmd.cmd)
      } catch (e: any) {
        this.cmdOutput = e?.response?.data?.error || e.message || 'Error'
      }
      this.runningCmd = ''
    },

    async runDeviceAction(action: string) {
      if (this.confirmAction !== action) {
        this.confirmAction = action
        return
      }
      this.confirmAction = null
      this.deviceActionRunning = true
      try {
        const cmd = action === 'reboot' ? 'reboot' : 'halt'
        await this.$axios.$post('/api/exec', { command: cmd }, { headers: { 'x-socket-id': this.socketId } })
        ;(this as any).$toast(action === 'reboot' ? 'Device is rebooting…' : 'Device is shutting down…', 'info')
      } catch (_) {
        ;(this as any).$toast('Command sent — device may take a moment to respond', 'info')
      }
      this.deviceActionRunning = false
    },

    log(type: string, msg: string) {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      this.activityLog.push({ id: ++this.logSeq, time, type, msg })
      if (this.activityLog.length > 60) this.activityLog.shift()
    },
  },
})
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 16px; }

/* ---- STAT CARDS ---- */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

.stat-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
  transition: border-color 0.2s, box-shadow 0.3s;
  overflow: hidden;
}
.stat-card:hover { border-color: var(--border2); }
.card-flash { animation: card-flash 0.5s ease; }
@keyframes card-flash {
  0% { box-shadow: 0 0 0 0 rgba(255,140,66,0); }
  30% { box-shadow: 0 0 0 3px rgba(255,140,66,0.2); }
  100% { box-shadow: 0 0 0 0 rgba(255,140,66,0); }
}

.stat-header { display: flex; align-items: center; justify-content: space-between; }
.stat-label { font-size: 11px; font-weight: 600; color: var(--text-dim); display: flex; align-items: center; gap: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-label i { font-size: 10px; color: var(--accent); }
.stat-right { display: flex; align-items: center; gap: 6px; }
.freq-badge { font-size: 9px; color: var(--accent); background: var(--accent-dim); padding: 1px 5px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; }
.stat-badge { font-size: 10px; color: var(--text-faint); background: var(--card2); padding: 1px 6px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); box-shadow: 0 0 5px var(--green); animation: pulse-dot 2s ease infinite; }
@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.ring-wrap { display: flex; justify-content: center; }
.ring { width: 88px; height: 88px; border-radius: 50%; position: relative; transition: background 0.6s ease; }
.ring-inner { position: absolute; inset: 11px; border-radius: 50%; background: var(--card); display: flex; align-items: center; justify-content: center; flex-direction: column; }
.ring-val { font-size: 20px; font-weight: 700; color: var(--text); line-height: 1; transition: all 0.4s ease; }
.ring-unit { font-size: 10px; color: var(--text-faint); }

.sparkline { width: 100%; height: 22px; display: block; }

.stat-sub { display: flex; justify-content: space-between; }
.stat-sub span { font-size: 10px; color: var(--text-faint); font-family: 'JetBrains Mono', monospace; }

.disk-bar-wrap { display: flex; flex-direction: column; gap: 5px; }
.disk-bar { height: 5px; background: var(--card2); border-radius: 3px; overflow: hidden; }
.disk-fill { height: 100%; background: linear-gradient(90deg, #5EEAD4, #67E8F9); border-radius: 3px; transition: width 0.6s ease; }
.disk-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-faint); font-family: 'JetBrains Mono', monospace; }

.temp-badge { font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-cool { background: var(--green-dim); color: var(--green); }
.badge-warm { background: var(--yellow-dim); color: var(--yellow); }
.badge-hot  { background: var(--red-dim); color: var(--red); }

.temp-scale { display: flex; align-items: center; gap: 6px; }
.scale-lo, .scale-hi { font-size: 9px; color: var(--text-faint); flex-shrink: 0; }
.scale-bar { flex: 1; height: 4px; border-radius: 2px; background: linear-gradient(to right, #5EEAD4, #FBBF24, #F87171); position: relative; }
.scale-cursor { position: absolute; top: -3px; width: 10px; height: 10px; border-radius: 50%; background: #fff; border: 2px solid var(--card); box-shadow: 0 0 6px rgba(0,0,0,0.5); transform: translateX(-50%); transition: left 0.5s ease; }

/* ---- SKELETON ---- */
.skeleton-card { gap: 12px; }
.skel { border-radius: 6px; background: linear-gradient(90deg, var(--card2) 25%, var(--border) 50%, var(--card2) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-label { height: 12px; width: 60%; }
.skel-ring { width: 88px; height: 88px; border-radius: 50%; margin: 0 auto; }
.skel-bar { height: 4px; width: 100%; }
.skel-net { height: 60px; width: 100%; border-radius: 8px; display: block; }

/* ---- MID ROW ---- */
.mid-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 14px; }

.net-card, .info-card, .quick-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px;
  display: flex; flex-direction: column; gap: 10px; overflow: hidden;
}
.card-title {
  font-size: 11px; font-weight: 600; color: var(--text-dim);
  text-transform: uppercase; letter-spacing: 0.5px;
  display: flex; align-items: center; gap: 6px;
}
.card-title i { color: var(--accent); font-size: 11px; }
.iface-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; background: var(--accent-dim); color: var(--accent); padding: 1px 5px; border-radius: 4px; }

.net-loading { display: flex; }
.net-body { display: flex; align-items: center; gap: 12px; }
.net-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.net-dir { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; }
.net-dir.down { color: var(--green); } .net-dir.up { color: var(--accent); }
.net-speed { font-size: 16px; font-weight: 700; color: var(--text); font-family: 'JetBrains Mono', monospace; transition: all 0.3s; }
.net-total { font-size: 9px; color: var(--text-faint); font-family: 'JetBrains Mono', monospace; }
.net-divider { width: 1px; height: 40px; background: var(--border); }
.net-sparkline { width: 100%; height: 30px; }
.net-legend { display: flex; gap: 12px; }
.legend-item { font-size: 10px; color: var(--text-faint); display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 8px; height: 3px; border-radius: 2px; }
.legend-item.rx .legend-dot { background: var(--green); }
.legend-item.tx .legend-dot { background: var(--accent); }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.info-item { display: flex; flex-direction: column; gap: 2px; }
.info-key { font-size: 9px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.5px; }
.info-val { font-size: 11px; color: var(--text); }
.info-val.mono { font-family: 'JetBrains Mono', monospace; font-size: 10px; }
.mono { font-family: 'JetBrains Mono', monospace; }

.hw-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.hw-chip { font-size: 9px; color: var(--text-dim); background: var(--card2); border: 1px solid var(--border); border-radius: 8px; padding: 2px 7px; display: flex; align-items: center; gap: 3px; }
.hw-chip i { font-size: 8px; color: var(--accent); }

.cmd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.cmd-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 8px; background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  cursor: pointer; font-size: 10px; color: var(--text-dim); transition: all 0.13s; text-align: left;
}
.cmd-btn:hover { background: var(--accent-dim); border-color: rgba(255,140,66,0.2); color: var(--accent); }
.cmd-btn.running { opacity: 0.5; cursor: wait; }
.cmd-btn i { font-size: 10px; color: var(--accent); width: 12px; flex-shrink: 0; }

.cmd-output { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.cmd-output-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--card2); border-bottom: 1px solid var(--border); font-size: 10px; }
.accent { color: var(--accent); }
.cmd-pre { padding: 8px 10px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text); white-space: pre-wrap; word-break: break-all; max-height: 120px; overflow-y: auto; }

.tiny-btn { background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 10px; padding: 2px 4px; border-radius: 3px; transition: color 0.15s; }
.tiny-btn:hover { color: var(--text-dim); }
.ml-auto { margin-left: auto; }

.slide-output-enter-active { animation: slide-down-in 0.2s ease; }
.slide-output-leave-active { animation: slide-up-out 0.15s ease forwards; }
@keyframes slide-down-in { from { opacity: 0; transform: translateY(-6px); } }
@keyframes slide-up-out { to { opacity: 0; transform: translateY(-6px); } }

/* ---- ACTIVITY ---- */
.activity-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.log-count { background: var(--accent-dim); color: var(--accent); font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; }
.live-indicator { display: flex; align-items: center; gap: 3px; margin-left: 4px; }
.live-dot-a { width: 4px; height: 4px; border-radius: 50%; background: var(--green); animation: live-blink 1.4s ease infinite; }
.live-dot-a:nth-child(2) { animation-delay: 0.2s; }
.live-dot-a:nth-child(3) { animation-delay: 0.4s; }
@keyframes live-blink { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }
.live-label { font-size: 9px; color: var(--green); font-weight: 700; letter-spacing: 0.5px; }

.activity-log { max-height: 130px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
.log-empty { font-size: 12px; color: var(--text-faint); text-align: center; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 7px; }
.log-row { display: flex; align-items: baseline; gap: 8px; padding: 4px 6px; border-radius: 5px; font-size: 11px; transition: background 0.1s; }
.log-row:hover { background: var(--card2); }
.log-time { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text-faint); flex-shrink: 0; }
.log-type { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; padding: 1px 5px; border-radius: 4px; flex-shrink: 0; }
.log-type.stats { background: var(--accent-dim); color: var(--accent); }
.log-type.cmd   { background: var(--blue-dim); color: var(--blue); }
.log-type.error { background: var(--red-dim); color: var(--red); }
.log-msg { color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

.log-entry-enter-active { animation: log-in 0.25s ease; }
@keyframes log-in { from { opacity: 0; transform: translateX(-8px); } }

/* ---- DEVICE CONTROLS ---- */
.controls-row { display: flex; }
.ctrl-card {
  flex: 1; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.ctrl-btns { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.ctrl-action { display: flex; flex-direction: column; gap: 5px; }
.ctrl-btn {
  display: flex; align-items: center; gap: 9px;
  padding: 11px 20px; border: none; border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.ctrl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.reboot-btn  { background: var(--blue-dim);   color: var(--blue);   border: 1px solid rgba(124,176,232,0.2); }
.shutdown-btn { background: var(--red-dim);   color: var(--red);    border: 1px solid rgba(248,113,113,0.2); }
.reboot-btn:hover:not(:disabled)   { background: rgba(124,176,232,0.2); }
.shutdown-btn:hover:not(:disabled) { background: rgba(248,113,113,0.2); }
.ctrl-hint { font-size: 10px; color: var(--text-faint); max-width: 220px; line-height: 1.4; }
.ctrl-cancel {
  align-self: flex-start; display: flex; align-items: center; gap: 5px;
  padding: 9px 14px; background: none; border: 1px solid var(--border2); border-radius: var(--radius-sm);
  color: var(--text-dim); font-size: 12px; cursor: pointer; transition: all 0.15s; margin-left: auto;
}
.ctrl-cancel:hover { background: var(--card2); }
.fade-ctrl-enter-active { animation: fade-in-quick 0.15s ease; }
.fade-ctrl-leave-active { animation: fade-out-quick 0.15s ease forwards; }
@keyframes fade-in-quick { from { opacity: 0; } }
@keyframes fade-out-quick { to { opacity: 0; } }
</style>
