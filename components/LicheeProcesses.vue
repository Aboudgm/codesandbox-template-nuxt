<template>
  <div class="proc-panel">
    <div class="proc-toolbar">
      <div class="proc-title"><i class="fas fa-tasks"></i> Running Processes</div>
      <div class="toolbar-right">
        <input v-model="search" class="search-input" placeholder="Filter processes..." />
        <button class="toolbar-btn" @click="refresh"><i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> Refresh</button>
        <label class="auto-toggle">
          <input type="checkbox" v-model="autoRefresh" />
          <span>Auto <span class="badge-green">5s</span></span>
        </label>
      </div>
    </div>

    <!-- Summary bar -->
    <div class="proc-summary">
      <div class="summary-chip">
        <i class="fas fa-layer-group"></i>
        <span>{{ processes.length }} processes</span>
      </div>
      <div class="summary-chip">
        <i class="fas fa-microchip"></i>
        <span>CPU: {{ totalCpu }}%</span>
      </div>
      <div class="summary-chip">
        <i class="fas fa-memory"></i>
        <span>MEM: {{ totalMem }}%</span>
      </div>
    </div>

    <!-- Table -->
    <div class="proc-table-wrap">
      <table class="proc-table">
        <thead>
          <tr>
            <th @click="sortBy('pid')">PID <i :class="sortIcon('pid')"></i></th>
            <th @click="sortBy('cmd')">Command <i :class="sortIcon('cmd')"></i></th>
            <th @click="sortBy('cpu')">CPU% <i :class="sortIcon('cpu')"></i></th>
            <th @click="sortBy('mem')">MEM% <i :class="sortIcon('mem')"></i></th>
            <th>Status</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && !processes.length">
            <td colspan="6" class="loading-cell">
              <i class="fas fa-circle-notch fa-spin"></i> Loading processes...
            </td>
          </tr>
          <tr v-else-if="!filteredProcesses.length">
            <td colspan="6" class="empty-cell">No processes found</td>
          </tr>
          <tr
            v-for="proc in filteredProcesses"
            :key="proc.pid"
            :class="['proc-row', { 'high-cpu': parseFloat(proc.cpu) > 10, 'high-mem': parseFloat(proc.mem) > 10 }]"
          >
            <td class="pid-cell mono">{{ proc.pid }}</td>
            <td class="cmd-cell">
              <span class="cmd-name">{{ shortCmd(proc.cmd) }}</span>
              <span v-if="proc.cmd.length > 30" class="cmd-full" :title="proc.cmd">···</span>
            </td>
            <td class="cpu-cell">
              <div class="inline-bar">
                <div class="inline-fill" :style="{ width: Math.min(100, parseFloat(proc.cpu) * 2) + '%', background: cpuColor(proc.cpu) }"></div>
              </div>
              <span class="mono" :style="{ color: cpuColor(proc.cpu) }">{{ proc.cpu }}</span>
            </td>
            <td class="mem-cell">
              <div class="inline-bar">
                <div class="inline-fill" :style="{ width: Math.min(100, parseFloat(proc.mem) * 5) + '%', background: '#7CB0E8' }"></div>
              </div>
              <span class="mono">{{ proc.mem }}</span>
            </td>
            <td>
              <span :class="['stat-badge', statClass(proc.stat)]">{{ proc.stat || '?' }}</span>
            </td>
            <td class="user-cell mono">{{ proc.user || 'root' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'LicheeProcesses',
  inject: ['$toast'],
  props: { socketId: { type: String, required: true } },
  data() {
    return {
      processes: [] as any[],
      loading: false,
      search: '',
      autoRefresh: true,
      timer: null as any,
      sortKey: 'cpu',
      sortDir: 'desc',
    }
  },
  computed: {
    filteredProcesses(): any[] {
      let procs = this.processes
      if (this.search) {
        const q = this.search.toLowerCase()
        procs = procs.filter((p: any) => p.cmd?.toLowerCase().includes(q) || p.pid?.includes(q))
      }
      return [...procs].sort((a: any, b: any) => {
        const av = this.sortKey === 'pid' ? parseInt(a[this.sortKey]) : parseFloat(a[this.sortKey])
        const bv = this.sortKey === 'pid' ? parseInt(b[this.sortKey]) : parseFloat(b[this.sortKey])
        return this.sortDir === 'asc' ? av - bv : bv - av
      })
    },
    totalCpu(): string {
      return this.processes.reduce((s: number, p: any) => s + parseFloat(p.cpu || 0), 0).toFixed(1)
    },
    totalMem(): string {
      return this.processes.reduce((s: number, p: any) => s + parseFloat(p.mem || 0), 0).toFixed(1)
    },
  },
  mounted() {
    this.refresh()
    this.timer = setInterval(() => { if (this.autoRefresh) this.refresh() }, 5000)
  },
  beforeDestroy() { clearInterval(this.timer) },
  methods: {
    async refresh() {
      this.loading = true
      try {
        const data = await this.$axios.$get('/api/processes', {
          headers: { 'x-socket-id': this.socketId },
        })
        this.processes = data.processes || []
      } catch (_) {}
      this.loading = false
    },
    sortBy(key: string) {
      if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'
      else { this.sortKey = key; this.sortDir = 'desc' }
    },
    sortIcon(key: string) {
      if (this.sortKey !== key) return 'fas fa-sort'
      return this.sortDir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'
    },
    shortCmd(cmd: string) { return cmd?.length > 40 ? cmd.slice(0, 40) : cmd },
    cpuColor(cpu: string) {
      const v = parseFloat(cpu)
      if (v > 50) return '#F87171'
      if (v > 20) return '#FBBF24'
      if (v > 5) return '#FF8C42'
      return '#5EEAD4'
    },
    statClass(stat: string) {
      if (!stat) return 'stat-unknown'
      if (stat.startsWith('S')) return 'stat-sleeping'
      if (stat.startsWith('R')) return 'stat-running'
      if (stat.startsWith('Z')) return 'stat-zombie'
      if (stat.startsWith('D')) return 'stat-io'
      return 'stat-other'
    },
  },
})
</script>

<style scoped>
.proc-panel { display: flex; flex-direction: column; gap: 14px; height: 100%; }

.proc-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 16px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
}
.proc-title { font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; }
.proc-title i { color: var(--accent); }
.toolbar-right { display: flex; align-items: center; gap: 8px; }
.search-input {
  background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); font-size: 12px; padding: 6px 10px; width: 180px; outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: rgba(255,140,66,0.3); }
.search-input::placeholder { color: var(--text-faint); }
.toolbar-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-dim); font-size: 12px; padding: 6px 12px; cursor: pointer; transition: all 0.15s;
}
.toolbar-btn:hover { background: var(--accent-dim); color: var(--accent); border-color: rgba(255,140,66,0.2); }
.auto-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-dim); cursor: pointer; }
.auto-toggle input { accent-color: var(--accent); }
.badge-green { background: var(--green-dim); color: var(--green); font-size: 10px; padding: 1px 5px; border-radius: 8px; }

.proc-summary { display: flex; gap: 10px; }
.summary-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 12px; color: var(--text-dim);
}
.summary-chip i { font-size: 11px; color: var(--accent); }

.proc-table-wrap {
  flex: 1; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: auto;
}
.proc-table { width: 100%; border-collapse: collapse; }
.proc-table thead tr {
  background: var(--card2);
  border-bottom: 1px solid var(--border);
}
.proc-table th {
  padding: 9px 14px; text-align: left;
  font-size: 10px; font-weight: 600; color: var(--text-faint);
  text-transform: uppercase; letter-spacing: 0.5px;
  cursor: pointer; user-select: none; white-space: nowrap;
}
.proc-table th:hover { color: var(--text-dim); }
.proc-table th i { margin-left: 4px; font-size: 9px; }

.proc-row { border-bottom: 1px solid rgba(42,38,56,0.5); transition: background 0.1s; }
.proc-row:hover { background: rgba(42,38,56,0.7); }
.proc-row.high-cpu { background: rgba(248,113,113,0.04); }
.proc-row.high-mem { background: rgba(124,176,232,0.04); }
.proc-table td { padding: 7px 14px; font-size: 12px; color: var(--text-dim); vertical-align: middle; }

.pid-cell { color: var(--text-faint); width: 60px; }
.cmd-cell { max-width: 300px; }
.cmd-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 280px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text); }
.cmd-full { color: var(--text-faint); font-size: 10px; cursor: help; }

.cpu-cell, .mem-cell { width: 100px; }
.inline-bar { height: 3px; background: var(--card2); border-radius: 2px; margin-bottom: 3px; overflow: hidden; }
.inline-fill { height: 100%; border-radius: 2px; transition: width 0.4s; }

.stat-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 8px; font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
}
.stat-running { background: var(--green-dim); color: var(--green); }
.stat-sleeping { background: var(--blue-dim); color: var(--blue); }
.stat-zombie { background: var(--red-dim); color: var(--red); }
.stat-io { background: var(--yellow-dim); color: var(--yellow); }
.stat-other, .stat-unknown { background: var(--card2); color: var(--text-faint); }

.user-cell { font-size: 10px; color: var(--text-faint); }
.mono { font-family: 'JetBrains Mono', monospace; }
.loading-cell, .empty-cell { padding: 40px; text-align: center; color: var(--text-faint); font-size: 13px; }
</style>
