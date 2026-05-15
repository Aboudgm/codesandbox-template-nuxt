<template>
  <div class="dashboard">
    <!-- Top stat cards -->
    <div class="stats-grid">
      <!-- CPU -->
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label"><i class="fas fa-microchip"></i> CPU</span>
          <span class="stat-badge cpu-badge">{{ stats.cpu.load }} avg</span>
        </div>
        <div class="ring-wrap">
          <div class="ring" :style="ringStyle(stats.cpu.pct, '#FF8C42')">
            <div class="ring-inner">
              <span class="ring-val">{{ stats.cpu.pct }}</span>
              <span class="ring-unit">%</span>
            </div>
          </div>
        </div>
        <div class="stat-sub">
          <span>1m: {{ stats.load.one }}</span>
          <span>5m: {{ stats.load.five }}</span>
          <span>15m: {{ stats.load.fifteen }}</span>
        </div>
      </div>

      <!-- Memory -->
      <div class="stat-card">
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
        <div class="bar-row">
          <div class="mini-bar">
            <div class="mini-bar-fill" :style="{ width: stats.memory.pct + '%', background: '#7CB0E8' }"></div>
          </div>
        </div>
      </div>

      <!-- Disk -->
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label"><i class="fas fa-hdd"></i> Disk</span>
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
        <div class="bar-row">
          <div class="mini-bar">
            <div class="mini-bar-fill" :style="{ width: stats.disk.pct + '%', background: '#5EEAD4' }"></div>
          </div>
        </div>
      </div>

      <!-- Temperature -->
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label"><i class="fas fa-thermometer-half"></i> Temp</span>
          <span class="stat-badge" :class="tempClass">{{ tempLabel }}</span>
        </div>
        <div class="ring-wrap">
          <div class="ring" :style="ringStyle(tempPct, tempColor)">
            <div class="ring-inner">
              <span class="ring-val" :style="{ color: tempColor }">{{ stats.temperature }}</span>
              <span class="ring-unit">°C</span>
            </div>
          </div>
        </div>
        <div class="temp-scale">
          <span class="temp-cold">0°</span>
          <div class="temp-gradient"></div>
          <span class="temp-hot">100°</span>
        </div>
      </div>
    </div>

    <!-- Info + Activity row -->
    <div class="info-row">
      <!-- System Info -->
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
            <span class="info-key">Board</span>
            <span class="info-val mono">LicheeRV Nano</span>
          </div>
          <div class="info-item">
            <span class="info-key">SoC</span>
            <span class="info-val mono">Sipeed SG2002</span>
          </div>
        </div>

        <!-- Specs chips -->
        <div class="hw-chips">
          <span class="hw-chip"><i class="fas fa-microchip"></i> RISC-V C906 @ 1GHz</span>
          <span class="hw-chip"><i class="fas fa-bolt"></i> 1 TOPS NPU</span>
          <span class="hw-chip"><i class="fas fa-ethernet"></i> 100 Mbps</span>
          <span class="hw-chip"><i class="fas fa-memory"></i> 256MB DDR3</span>
        </div>
      </div>

      <!-- Quick Commands -->
      <div class="quick-card">
        <div class="card-title"><i class="fas fa-terminal"></i> Quick Commands</div>
        <div class="cmd-list">
          <button
            v-for="cmd in quickCmds"
            :key="cmd.label"
            class="cmd-btn"
            :class="{ running: runningCmd === cmd.label }"
            @click="runCmd(cmd)"
          >
            <i :class="cmd.icon"></i>
            <span>{{ cmd.label }}</span>
          </button>
        </div>
        <div v-if="cmdOutput" class="cmd-output">
          <div class="cmd-output-header">
            <span class="mono">$ {{ lastCmd }}</span>
            <button class="clear-btn" @click="cmdOutput = ''"><i class="fas fa-times"></i></button>
          </div>
          <pre class="cmd-result">{{ cmdOutput }}</pre>
        </div>
      </div>
    </div>

    <!-- Activity log -->
    <div class="activity-card">
      <div class="card-title">
        <i class="fas fa-list-alt"></i> Activity
        <span class="activity-count">{{ activityLog.length }}</span>
        <button class="clear-btn ml-auto" @click="activityLog = []"><i class="fas fa-trash"></i> Clear</button>
      </div>
      <div class="activity-log" ref="activityLog">
        <div v-if="activityLog.length === 0" class="activity-empty">
          <i class="fas fa-circle-notch fa-spin"></i> Collecting data...
        </div>
        <div v-for="(entry, i) in activityLog.slice().reverse()" :key="i" class="activity-entry">
          <span class="activity-time">{{ entry.time }}</span>
          <span :class="['activity-type', entry.type]">{{ entry.type }}</span>
          <span class="activity-msg">{{ entry.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

const defaultStats = () => ({
  cpu: { pct: 0, load: '0.00' },
  memory: { used: 0, total: 256, pct: 0 },
  disk: { used: '?', total: '?', pct: 0 },
  temperature: 0,
  uptime: '...',
  load: { one: '0.00', five: '0.00', fifteen: '0.00' },
  hostname: '...',
  kernel: '...',
  arch: 'riscv64',
})

export default Vue.extend({
  name: 'LicheeDashboard',
  props: {
    socketId: { type: String, required: true },
  },
  data() {
    return {
      stats: defaultStats() as any,
      timer: null as any,
      activityLog: [] as any[],
      cmdOutput: '',
      lastCmd: '',
      runningCmd: '',
      quickCmds: [
        { label: 'dmesg tail', icon: 'fas fa-scroll', cmd: 'dmesg | tail -20' },
        { label: 'disk usage', icon: 'fas fa-hdd', cmd: 'df -h' },
        { label: 'memory info', icon: 'fas fa-memory', cmd: 'free -h' },
        { label: 'network', icon: 'fas fa-network-wired', cmd: 'ip addr' },
        { label: 'processes', icon: 'fas fa-tasks', cmd: 'ps aux | head -15' },
        { label: 'uptime', icon: 'fas fa-clock', cmd: 'uptime' },
        { label: 'uname -a', icon: 'fas fa-info-circle', cmd: 'uname -a' },
        { label: 'env', icon: 'fas fa-list', cmd: 'env | sort | head -30' },
      ],
    }
  },
  computed: {
    tempPct(): number {
      return Math.min(100, (this.stats.temperature / 100) * 100)
    },
    tempColor(): string {
      const t = this.stats.temperature
      if (t < 50) return '#5EEAD4'
      if (t < 70) return '#FBBF24'
      return '#F87171'
    },
    tempClass(): string {
      const t = this.stats.temperature
      if (t < 50) return 'temp-ok'
      if (t < 70) return 'temp-warm'
      return 'temp-hot-badge'
    },
    tempLabel(): string {
      const t = this.stats.temperature
      if (t < 50) return 'Cool'
      if (t < 70) return 'Warm'
      return 'Hot!'
    },
  },
  mounted() {
    this.fetchStats()
    this.timer = setInterval(this.fetchStats, 4000)
  },
  beforeDestroy() {
    clearInterval(this.timer)
  },
  methods: {
    ringStyle(pct: number, color: string) {
      const p = Math.min(100, Math.max(0, pct))
      return {
        background: `conic-gradient(${color} 0% ${p}%, var(--card2) ${p}% 100%)`,
        boxShadow: `0 0 18px ${color}30`,
      }
    },
    async fetchStats() {
      try {
        const data = await this.$axios.$get('/api/stats', {
          headers: { 'x-socket-id': this.socketId },
        })
        this.stats = data
        this.$emit('uptime', data.uptime || '')
        this.$emit('hostname', data.hostname || '')
        this.logActivity('stats', `CPU ${data.cpu.pct}% · RAM ${data.memory.pct}% · ${data.temperature}°C`)
      } catch (_) {}
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
        this.logActivity('cmd', cmd.cmd)
      } catch (e: any) {
        this.cmdOutput = e.message || 'Error'
      }
      this.runningCmd = ''
    },
    logActivity(type: string, msg: string) {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      this.activityLog.push({ time, type, msg })
      if (this.activityLog.length > 50) this.activityLog.shift()
    },
  },
})
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 20px; }

/* Stats grid */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  display: flex; flex-direction: column; gap: 12px;
  transition: border-color 0.2s;
}
.stat-card:hover { border-color: var(--border2); }

.stat-header { display: flex; align-items: center; justify-content: space-between; }
.stat-label { font-size: 12px; font-weight: 600; color: var(--text-dim); display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-label i { font-size: 11px; color: var(--accent); }
.stat-badge { font-size: 10px; color: var(--text-faint); background: var(--card2); padding: 2px 7px; border-radius: 10px; font-family: 'JetBrains Mono', monospace; }
.cpu-badge { color: var(--accent); background: var(--accent-dim); }
.temp-ok { color: var(--green) !important; background: var(--green-dim) !important; }
.temp-warm { color: var(--yellow) !important; background: var(--yellow-dim) !important; }
.temp-hot-badge { color: var(--red) !important; background: var(--red-dim) !important; }

.ring-wrap { display: flex; justify-content: center; }
.ring {
  width: 90px; height: 90px; border-radius: 50%;
  position: relative; transition: background 0.5s ease;
}
.ring-inner {
  position: absolute; inset: 12px; border-radius: 50%;
  background: var(--card);
  display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 0;
}
.ring-val { font-size: 20px; font-weight: 700; color: var(--text); line-height: 1; }
.ring-unit { font-size: 10px; color: var(--text-faint); }

.stat-sub { display: flex; justify-content: space-between; }
.stat-sub span { font-size: 10px; color: var(--text-faint); font-family: 'JetBrains Mono', monospace; }

.bar-row { width: 100%; }
.mini-bar { height: 4px; background: var(--card2); border-radius: 2px; overflow: hidden; }
.mini-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }

.temp-scale { display: flex; align-items: center; gap: 6px; }
.temp-cold, .temp-hot { font-size: 9px; color: var(--text-faint); }
.temp-gradient {
  flex: 1; height: 4px; border-radius: 2px;
  background: linear-gradient(to right, #5EEAD4, #FBBF24, #F87171);
}

/* Info row */
.info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.info-card, .quick-card, .activity-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
}

.card-title {
  font-size: 12px; font-weight: 600; color: var(--text-dim);
  text-transform: uppercase; letter-spacing: 0.5px;
  display: flex; align-items: center; gap: 7px;
  margin-bottom: 14px;
}
.card-title i { color: var(--accent); font-size: 11px; }
.ml-auto { margin-left: auto; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.info-item { display: flex; flex-direction: column; gap: 2px; }
.info-key { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.5px; }
.info-val { font-size: 12px; color: var(--text); }
.info-val.mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }

.hw-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.hw-chip {
  font-size: 10px; color: var(--text-dim);
  background: var(--card2); border: 1px solid var(--border);
  border-radius: 10px; padding: 3px 8px;
  display: flex; align-items: center; gap: 4px;
}
.hw-chip i { font-size: 9px; color: var(--accent); }

/* Quick commands */
.cmd-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.cmd-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 10px;
  background: var(--card2); border: 1px solid var(--border);
  border-radius: var(--radius-sm); cursor: pointer;
  font-size: 11px; color: var(--text-dim);
  transition: all 0.15s; text-align: left;
}
.cmd-btn:hover { background: var(--accent-dim); border-color: rgba(255,140,66,0.2); color: var(--accent); }
.cmd-btn.running { opacity: 0.5; cursor: wait; }
.cmd-btn i { font-size: 10px; color: var(--accent); width: 12px; }

.cmd-output {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.cmd-output-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 12px;
  background: var(--card2);
  border-bottom: 1px solid var(--border);
  font-size: 11px; color: var(--accent);
}
.clear-btn {
  background: none; border: none; cursor: pointer;
  color: var(--text-faint); font-size: 10px;
  padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
}
.clear-btn:hover { color: var(--text-dim); }
.cmd-result {
  padding: 10px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--text);
  white-space: pre-wrap; word-break: break-all;
  max-height: 150px; overflow-y: auto;
}

/* Activity */
.activity-card { flex-shrink: 0; }
.activity-count {
  background: var(--accent-dim); color: var(--accent);
  font-size: 10px; padding: 1px 7px; border-radius: 10px; font-weight: 600;
}
.activity-log {
  display: flex; flex-direction: column; gap: 4px;
  max-height: 160px; overflow-y: auto;
}
.activity-empty { font-size: 12px; color: var(--text-faint); text-align: center; padding: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.activity-entry {
  display: flex; align-items: baseline; gap: 8px;
  padding: 5px 8px; border-radius: 6px;
  font-size: 11px; transition: background 0.1s;
}
.activity-entry:hover { background: var(--card2); }
.activity-time { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-faint); flex-shrink: 0; }
.activity-type {
  font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  padding: 1px 6px; border-radius: 4px; flex-shrink: 0;
}
.activity-type.stats { background: var(--accent-dim); color: var(--accent); }
.activity-type.cmd { background: var(--blue-dim); color: var(--blue); }
.activity-msg { color: var(--text-dim); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mono { font-family: 'JetBrains Mono', monospace; }
</style>
