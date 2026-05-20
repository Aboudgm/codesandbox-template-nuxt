<template>
  <div class="city-app">
    <!-- ── Header ── -->
    <header class="app-header">
      <div class="header-brand">
        <span class="brand-icon">🏙</span>
        <span class="brand-name">Multi-Agent City Builder</span>
        <span class="phase-tag" :class="phase">{{ phaseLabel }}</span>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <div class="stat-val">{{ totalBuilt }}</div>
          <div class="stat-lbl">Structures</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">{{ activeCount }}</div>
          <div class="stat-lbl">Active Agents</div>
        </div>
        <div class="stat-item">
          <div class="stat-val">{{ elapsed }}s</div>
          <div class="stat-lbl">Runtime</div>
        </div>
      </div>
      <button class="btn-restart" @click="restart">↺ Restart</button>
    </header>

    <div class="app-body">
      <!-- ── Agent Panel ── -->
      <aside class="side-panel left-panel">
        <div class="panel-header">AGENT SWARM</div>
        <div class="agents-list">
          <div
            v-for="ag in agentList"
            :key="ag.id"
            class="agent-card"
            :class="ag.status"
            :style="ag.status === 'active' ? { borderColor: ag.color + '55' } : {}"
          >
            <div class="ac-top">
              <span class="ac-icon">{{ ag.icon }}</span>
              <div class="ac-meta">
                <div class="ac-name">{{ ag.name }}</div>
                <div class="ac-status-text">{{ ag.statusText }}</div>
              </div>
              <div
                class="ac-dot"
                :class="ag.status"
                :style="ag.status === 'active'
                  ? { background: ag.color, boxShadow: '0 0 8px ' + ag.color }
                  : ag.status === 'complete'
                  ? { background: '#22c55e' }
                  : {}"
              ></div>
            </div>
            <div class="ac-progress-track">
              <div
                class="ac-progress-fill"
                :style="{ width: ag.progress + '%', background: ag.color }"
              ></div>
            </div>
            <div class="ac-footer">
              <span>{{ ag.cellsPlaced }} cells placed</span>
              <span class="ac-pct">{{ ag.progress }}%</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- ── City Viewport ── -->
      <main class="city-viewport">
        <div class="city-scene">
          <!-- grid-wrap makes pop-overlay align exactly over the grid -->
          <div class="grid-wrap">
            <div
              class="city-grid"
              :style="{ gridTemplateColumns: 'repeat(' + COLS + ', 1fr)' }"
            >
              <div
                v-for="(cell, i) in grid"
                :key="i"
                class="cell"
                :class="[cell.type, 'v' + cell.variant, { pulse: cell.justPlaced }]"
              ></div>
            </div>

            <!-- Population layer — inset:0 so it covers the grid exactly -->
            <div class="pop-overlay">
              <div
                v-for="p in population"
                :key="p.id"
                class="pop-dot"
                :style="{
                  left: ((p.col + 0.5) / COLS * 100) + '%',
                  top:  ((p.row + 0.5) / ROWS * 100) + '%',
                  background: p.color,
                  boxShadow: '0 0 5px ' + p.color
                }"
              ></div>
            </div>
          </div>
        </div>
      </main>

      <!-- ── Log Panel ── -->
      <aside class="side-panel right-panel">
        <div class="panel-header">SYSTEM LOG</div>
        <div class="log-list" ref="logList">
          <div
            v-for="(entry, i) in logs"
            :key="i"
            class="log-item"
            :class="entry.type"
          >
            <span class="li-time">{{ entry.time }}</span>
            <span class="li-agent" :style="{ color: entry.color }">{{ entry.agentName }}</span>
            <span class="li-msg">{{ entry.message }}</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

const COLS = 30
const ROWS = 20

interface Cell {
  type: string
  variant: number
  justPlaced: boolean
}

interface AgentState {
  id: string
  name: string
  icon: string
  color: string
  status: 'idle' | 'active' | 'complete'
  statusText: string
  progress: number
  cellsPlaced: number
}

interface LogEntry {
  time: string
  agentName: string
  color: string
  message: string
  type: string
}

interface Person {
  id: number
  col: number
  row: number
  color: string
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const AGENT_DEFS: AgentState[] = [
  { id: 'orchestrator', name: 'Orchestrator',   icon: '🧠', color: '#a855f7', status: 'idle', statusText: 'Initializing...', progress: 0, cellsPlaced: 0 },
  { id: 'roads',        name: 'Road Network',   icon: '🛣️', color: '#64748b', status: 'idle', statusText: 'Standby',         progress: 0, cellsPlaced: 0 },
  { id: 'downtown',     name: 'Downtown Core',  icon: '🏢', color: '#3b82f6', status: 'idle', statusText: 'Standby',         progress: 0, cellsPlaced: 0 },
  { id: 'residential',  name: 'Residential',    icon: '🏘️', color: '#f59e0b', status: 'idle', statusText: 'Standby',         progress: 0, cellsPlaced: 0 },
  { id: 'parks',        name: 'Parks & Green',  icon: '🌳', color: '#22c55e', status: 'idle', statusText: 'Standby',         progress: 0, cellsPlaced: 0 },
  { id: 'skyscrapers',  name: 'Skyscrapers',    icon: '🏙️', color: '#93c5fd', status: 'idle', statusText: 'Standby',         progress: 0, cellsPlaced: 0 },
  { id: 'population',   name: 'Population',     icon: '👥', color: '#ec4899', status: 'idle', statusText: 'Standby',         progress: 0, cellsPlaced: 0 },
]

export default Vue.extend({
  name: 'CityBuilder',

  data() {
    return {
      COLS,
      ROWS,
      grid:         [] as Cell[],
      agents:       {} as Record<string, AgentState>,
      logs:         [] as LogEntry[],
      population:   [] as Person[],
      phase:        'idle' as string,
      elapsed:      0,
      timers:       [] as ReturnType<typeof setTimeout>[],
      intervals:    [] as ReturnType<typeof setInterval>[],
      popIdCounter: 0,
      tickInterval: null as ReturnType<typeof setInterval> | null,
    }
  },

  computed: {
    agentList(): AgentState[] {
      return AGENT_DEFS.map((def) => this.agents[def.id]).filter(Boolean)
    },
    totalBuilt(): number {
      return this.grid.filter((c) => c.type !== 'empty').length
    },
    activeCount(): number {
      return Object.values(this.agents).filter((a) => a.status === 'active').length
    },
    phaseLabel(): string {
      const map: Record<string, string> = {
        idle:       'INITIALIZING',
        planning:   'PLANNING',
        roads:      'ROADS',
        zoning:     'ZONING',
        building:   'BUILDING',
        greening:   'GREENING',
        skyline:    'SKYLINE',
        populating: 'POPULATING',
        complete:   'COMPLETE',
      }
      return map[this.phase] || this.phase.toUpperCase()
    },
  },

  mounted() {
    this.initState()
    this.$nextTick(() => this.startSim())
  },

  beforeDestroy() {
    this.clearAll()
  },

  methods: {
    /* ── timer helpers ─────────────────────────────────── */

    clearAll() {
      this.timers.forEach(clearTimeout)
      this.intervals.forEach(clearInterval)
      this.timers = []
      this.intervals = []
      this.tickInterval = null
    },

    after(fn: () => void, ms: number) {
      const t = setTimeout(fn, ms)
      this.timers.push(t)
    },

    every(fn: () => void, ms: number): ReturnType<typeof setInterval> {
      const i = setInterval(fn, ms)
      this.intervals.push(i)
      return i
    },

    killInterval(i: ReturnType<typeof setInterval>) {
      clearInterval(i)
      const idx = this.intervals.indexOf(i)
      if (idx !== -1) this.intervals.splice(idx, 1)
    },

    /* ── state setup ───────────────────────────────────── */

    initState() {
      const grid: Cell[] = []
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          grid.push({ type: 'empty', variant: Math.floor(Math.random() * 4), justPlaced: false })
        }
      }
      this.grid = grid

      const agents: Record<string, AgentState> = {}
      AGENT_DEFS.forEach((def) => {
        agents[def.id] = { ...def }
      })
      this.agents = agents
    },

    /* ── cell helpers ──────────────────────────────────── */

    idx(col: number, row: number): number {
      return row * COLS + col
    },

    getCell(col: number, row: number): Cell | null {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
      return this.grid[this.idx(col, row)]
    },

    placeCell(col: number, row: number, type: string, agentId: string) {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
      const i = this.idx(col, row)
      const old = this.grid[i]
      Vue.set(this.grid, i, { type, variant: old.variant, justPlaced: true })
      const ag = this.agents[agentId]
      if (ag) ag.cellsPlaced++
      this.after(() => {
        const cur = this.grid[i]
        if (cur && cur.justPlaced && cur.type === type) {
          Vue.set(this.grid, i, { type: cur.type, variant: cur.variant, justPlaced: false })
        }
      }, 500)
    },

    /* ── logging ───────────────────────────────────────── */

    log(agentId: string, message: string, type: string = 'info') {
      const ag = this.agents[agentId]
      const color = ag ? ag.color : '#888'
      const now = new Date()
      const time = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      this.logs.unshift({ time, agentName: agentId.toUpperCase(), color, message, type })
      if (this.logs.length > 120) this.logs.pop()
    },

    /* ── restart ───────────────────────────────────────── */

    restart() {
      this.clearAll()
      this.logs        = []
      this.population  = []
      this.elapsed     = 0
      this.phase       = 'idle'
      this.popIdCounter = 0
      this.initState()
      this.$nextTick(() => this.startSim())
    },

    /* ── orchestrator ──────────────────────────────────── */

    startSim() {
      this.phase = 'planning'
      this.tickInterval = this.every(() => { this.elapsed++ }, 1000)

      const orc = this.agents.orchestrator
      orc.status    = 'active'
      orc.statusText = 'Analyzing terrain...'
      this.log('orchestrator', 'System online. Analyzing terrain topology.', 'system')

      this.after(() => {
        orc.progress   = 15
        orc.statusText = 'Generating zone map...'
        this.log('orchestrator', 'Terrain analysis complete. Generating zone map.')
      }, 700)

      this.after(() => {
        orc.progress = 25
        this.log('orchestrator', 'Dispatching Road Network agent.')
        this.runRoads()
      }, 1400)

      this.after(() => {
        orc.progress = 38
        this.log('orchestrator', 'Dispatching Downtown Core agent in parallel.')
        this.runDowntown()
      }, 3000)

      this.after(() => {
        orc.progress = 52
        this.log('orchestrator', 'Dispatching Residential agent.')
        this.runResidential()
      }, 5500)

      /* Parks dispatched after residential has had 6 s to fill the grid */
      this.after(() => {
        orc.progress = 65
        this.log('orchestrator', 'Dispatching Parks & Green agent.')
        this.runParks()
      }, 11500)

      /* Skyscrapers need downtown complete first (~8 s) */
      this.after(() => {
        orc.progress = 78
        this.log('orchestrator', 'Dispatching Skyscrapers agent.')
        this.runSkyscrapers()
      }, 14000)

      this.after(() => {
        orc.progress = 90
        this.log('orchestrator', 'Dispatching Population simulation agent.')
        this.runPopulation()
      }, 18000)

      this.after(() => {
        orc.progress   = 100
        orc.status     = 'complete'
        orc.statusText = 'All agents complete'
        this.phase = 'complete'
        if (this.tickInterval) this.killInterval(this.tickInterval)
        this.log('orchestrator', '✓ City construction complete. All subagents finished.', 'success')
      }, 36000)
    },

    /* ── Road Network agent ────────────────────────────── */

    runRoads() {
      const ag = this.agents.roads
      ag.status    = 'active'
      ag.statusText = 'Laying primary arteries...'
      this.phase   = 'roads'
      this.log('roads', 'Beginning road network construction.')

      const hRoads = [0, 4, 9, 14, 19]
      const vRoads = [0, 5, 10, 15, 20, 25, 29]
      const total  = hRoads.length * COLS + vRoads.length * ROWS
      let done = 0

      hRoads.forEach((row, ri) => {
        this.after(() => {
          for (let col = 0; col < COLS; col++) {
            this.after(() => {
              this.placeCell(col, row, 'road', 'roads')
              done++
              ag.progress = Math.min(99, Math.floor((done / total) * 100))
            }, col * 25)
          }
          this.log('roads', `Horizontal artery row ${row} complete.`)
        }, ri * 350)
      })

      const hDone = hRoads.length * 350 + COLS * 25 + 100

      this.after(() => {
        ag.statusText = 'Laying vertical arteries...'
        this.log('roads', 'Switching to vertical arteries.')
        vRoads.forEach((col, ci) => {
          this.after(() => {
            for (let row = 0; row < ROWS; row++) {
              this.after(() => {
                this.placeCell(col, row, 'road', 'roads')
                done++
                ag.progress = Math.min(99, Math.floor((done / total) * 100))
              }, row * 30)
            }
            this.log('roads', `Vertical artery col ${col} complete.`)
          }, ci * 260)
        })
      }, hDone)

      const allDone = hDone + vRoads.length * 260 + ROWS * 30 + 400
      this.after(() => {
        ag.status    = 'complete'
        ag.statusText = `${ag.cellsPlaced} road segments`
        ag.progress  = 100
        this.log('roads', `✓ Road network complete. ${ag.cellsPlaced} segments.`, 'success')
      }, allDone)
    },

    /* ── Downtown Core agent ───────────────────────────── */

    runDowntown() {
      const ag = this.agents.downtown
      ag.status    = 'active'
      ag.statusText = 'Zoning commercial core...'
      this.phase   = 'zoning'
      this.log('downtown', 'Identifying downtown zone.')

      const cx = Math.floor(COLS / 2)
      const cy = Math.floor(ROWS / 2)
      const r  = 4

      /* Scan immediately — placeCell checks for 'empty' at placement time */
      const plots: [number, number][] = []
      for (let row = cy - r; row <= cy + r; row++) {
        for (let col = cx - r; col <= cx + r; col++) {
          if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
            plots.push([col, row])
          }
        }
      }

      this.log('downtown', `${plots.length} downtown plots queued.`)

      plots.forEach(([col, row], i) => {
        this.after(() => {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'empty') {
            this.placeCell(col, row, 'commercial', 'downtown')
            ag.progress = Math.floor(((i + 1) / plots.length) * 100)
          }
        }, i * 50 + Math.random() * 25)
      })

      this.after(() => {
        ag.status    = 'complete'
        ag.statusText = `${ag.cellsPlaced} commercial buildings`
        ag.progress  = 100
        this.log('downtown', `✓ Downtown core complete. ${ag.cellsPlaced} buildings.`, 'success')
      }, plots.length * 50 + 500)
    },

    /* ── Residential agent ─────────────────────────────── */

    runResidential() {
      const ag = this.agents.residential
      ag.status    = 'active'
      ag.statusText = 'Filling residential zones...'
      this.phase   = 'building'
      this.log('residential', 'Scanning city for empty residential plots.')

      const cx = Math.floor(COLS / 2)
      const cy = Math.floor(ROWS / 2)

      const empties: [number, number][] = []
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2)
          if (dist > 3.5) empties.push([col, row])
        }
      }
      shuffle(empties)

      this.log('residential', `${empties.length} residential plots queued.`)

      empties.forEach(([col, row], i) => {
        this.after(() => {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'empty') {
            this.placeCell(col, row, 'residential', 'residential')
            ag.progress = Math.floor(((i + 1) / empties.length) * 100)
          }
        }, i * 20 + Math.random() * 12)
      })

      this.after(() => {
        ag.status    = 'complete'
        ag.statusText = `${ag.cellsPlaced} homes built`
        ag.progress  = 100
        this.log('residential', `✓ Residential zones complete. ${ag.cellsPlaced} homes.`, 'success')
      }, empties.length * 20 + 600)
    },

    /* ── Parks & Green agent ───────────────────────────── */

    runParks() {
      const ag = this.agents.parks
      ag.status    = 'active'
      ag.statusText = 'Planning green spaces...'
      this.phase   = 'greening'
      this.log('parks', 'Analyzing city density for park allocation.')

      /* Scan at dispatch time — residential has been running for 6 s */
      const candidates: [number, number][] = []
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'residential') {
            if ((col % 5 === 2 && row % 4 === 2) || Math.random() < 0.06) {
              candidates.push([col, row])
            }
          }
        }
      }

      this.log('parks', `${candidates.length} park sites selected.`)
      if (candidates.length === 0) {
        ag.status    = 'complete'
        ag.statusText = '0 parks (no sites yet)'
        ag.progress  = 100
        this.log('parks', 'No residential cells found yet — skipping.', 'info')
        return
      }

      candidates.forEach(([col, row], i) => {
        this.after(() => {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'residential') {
            this.placeCell(col, row, 'park', 'parks')
            ag.progress = Math.floor(((i + 1) / candidates.length) * 100)
          }
        }, i * 60 + Math.random() * 40)
      })

      this.after(() => {
        ag.status    = 'complete'
        ag.statusText = `${ag.cellsPlaced} parks planted`
        ag.progress  = 100
        this.log('parks', `✓ Green infrastructure complete. ${ag.cellsPlaced} parks.`, 'success')
      }, candidates.length * 60 + 500)
    },

    /* ── Skyscrapers agent ─────────────────────────────── */

    runSkyscrapers() {
      const ag = this.agents.skyscrapers
      ag.status    = 'active'
      ag.statusText = 'Identifying tower sites...'
      this.phase   = 'skyline'
      this.log('skyscrapers', 'Scanning downtown for prime tower locations.')

      const cx = Math.floor(COLS / 2)
      const cy = Math.floor(ROWS / 2)

      const candidates: [number, number][] = []
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'commercial') {
            const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2)
            if (dist <= 3.5 && Math.random() < 0.55) {
              candidates.push([col, row])
            }
          }
        }
      }

      this.log('skyscrapers', `${candidates.length} tower sites selected.`)
      if (candidates.length === 0) {
        ag.status    = 'complete'
        ag.statusText = '0 towers (no sites)'
        ag.progress  = 100
        this.log('skyscrapers', 'No commercial cells found — skipping.', 'info')
        return
      }

      candidates.forEach(([col, row], i) => {
        this.after(() => {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'commercial') {
            this.placeCell(col, row, 'skyscraper', 'skyscrapers')
            ag.progress = Math.floor(((i + 1) / candidates.length) * 100)
            this.log('skyscrapers', `Tower ${i + 1} erected at (${col}, ${row}).`)
          }
        }, i * 300)
      })

      this.after(() => {
        ag.status    = 'complete'
        ag.statusText = `${ag.cellsPlaced} towers built`
        ag.progress  = 100
        this.log('skyscrapers', `✓ Skyline complete. ${ag.cellsPlaced} skyscrapers.`, 'success')
      }, candidates.length * 300 + 500)
    },

    /* ── Population agent ──────────────────────────────── */

    runPopulation() {
      const ag = this.agents.population
      ag.status    = 'active'
      ag.statusText = 'Simulating citizens...'
      this.phase   = 'populating'
      this.log('population', 'Initializing population simulation.')

      const maxPop = 60
      const colors = ['#ec4899', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4']
      let count = 0

      /* Capture road positions once — roads are stable by this point */
      const roadCells: { col: number; row: number }[] = []
      this.grid.forEach((cell, i) => {
        if (cell.type === 'road') {
          roadCells.push({ col: i % COLS, row: Math.floor(i / COLS) })
        }
      })

      if (roadCells.length === 0) {
        ag.status    = 'complete'
        ag.statusText = 'No roads found'
        ag.progress  = 100
        this.log('population', 'No road cells found — skipping.', 'info')
        return
      }

      const spawnInterval = this.every(() => {
        if (count >= maxPop) {
          this.killInterval(spawnInterval)
          ag.status    = 'complete'
          ag.statusText = `${maxPop} citizens active`
          ag.progress  = 100
          this.log('population', `✓ Population simulation running. ${maxPop} citizens.`, 'success')
          return
        }
        const start = roadCells[Math.floor(Math.random() * roadCells.length)]
        this.population.push({
          id:    this.popIdCounter++,
          col:   start.col,
          row:   start.row,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
        count++
        ag.cellsPlaced = count
        ag.progress    = Math.floor((count / maxPop) * 100)
      }, 250)

      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]] as [number, number][]
      this.every(() => {
        this.population = this.population.map((p) => {
          const moves = dirs.filter(([dc, dr]) => {
            const cell = this.getCell(p.col + dc, p.row + dr)
            return cell && cell.type === 'road'
          })
          if (moves.length > 0 && Math.random() < 0.75) {
            const [dc, dr] = moves[Math.floor(Math.random() * moves.length)]
            return { ...p, col: p.col + dc, row: p.row + dr }
          }
          return p
        })
      }, 320)
    },
  },

  watch: {
    logs() {
      this.$nextTick(() => {
        const el = this.$refs.logList as HTMLElement
        if (el) el.scrollTop = 0
      })
    },
  },
})
</script>

<style scoped>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.city-app {
  height: 100vh;
  min-height: 100vh;
  background: #030712;
  color: #e2e8f0;
  font-family: 'Courier New', 'Lucida Console', monospace;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
.app-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background: #0d1117;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  min-height: 52px;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.brand-icon { font-size: 20px; flex-shrink: 0; }

.brand-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
  background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.phase-tag {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  white-space: nowrap;
  background: #1e293b;
  color: #64748b;
  border: 1px solid #334155;
  transition: all 0.4s;
}

.phase-tag.planning   { background: rgba(168,85,247,.12);  color: #a855f7; border-color: #a855f7; }
.phase-tag.roads      { background: rgba(100,116,139,.15); color: #94a3b8; border-color: #64748b; }
.phase-tag.zoning     { background: rgba(59,130,246,.12);  color: #3b82f6; border-color: #3b82f6; }
.phase-tag.building   { background: rgba(245,158,11,.12);  color: #f59e0b; border-color: #f59e0b; }
.phase-tag.greening   { background: rgba(34,197,94,.12);   color: #22c55e; border-color: #22c55e; }
.phase-tag.skyline    { background: rgba(147,197,253,.12); color: #93c5fd; border-color: #93c5fd; }
.phase-tag.populating { background: rgba(236,72,153,.12);  color: #ec4899; border-color: #ec4899; }
.phase-tag.complete   { background: rgba(34,197,94,.15);   color: #4ade80; border-color: #22c55e; }

.header-stats { display: flex; gap: 24px; flex-shrink: 0; }

.stat-item { text-align: center; }

.stat-val {
  font-size: 17px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1;
}

.stat-lbl {
  font-size: 8px;
  color: #475569;
  letter-spacing: 0.1em;
  margin-top: 2px;
  text-transform: uppercase;
}

.btn-restart {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.05em;
  transition: all 0.2s;
  flex-shrink: 0;
}
.btn-restart:hover { background: #334155; color: #f1f5f9; }

/* ── Body ── */
.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ── Side panels ── */
.side-panel {
  width: 200px;
  flex-shrink: 0;
  background: #080d14;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-panel  { border-right: 1px solid #1e293b; }
.right-panel { border-left:  1px solid #1e293b; }

.panel-header {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #334155;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

/* ── Agent cards ── */
.agents-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.agent-card {
  background: #0d1117;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 8px 9px;
  transition: border-color 0.3s, background 0.3s;
}

.agent-card.active  { background: #0b1523; }
.agent-card.complete { opacity: 0.65; }

.ac-top {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}

.ac-icon { font-size: 15px; flex-shrink: 0; line-height: 1; }

.ac-meta { flex: 1; min-width: 0; }

.ac-name {
  font-size: 10px;
  font-weight: 700;
  color: #cbd5e1;
  line-height: 1.2;
}

.ac-status-text {
  font-size: 8px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.ac-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #1e293b;
  transition: background 0.3s, box-shadow 0.3s;
}

.ac-dot.active   { animation: dot-blink 1.1s infinite; }
.ac-dot.complete { background: #22c55e !important; box-shadow: none !important; }

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}

.ac-progress-track {
  height: 2px;
  background: #1e293b;
  border-radius: 1px;
  overflow: hidden;
  margin-bottom: 5px;
}

.ac-progress-fill {
  height: 100%;
  border-radius: 1px;
  transition: width 0.35s ease;
}

.ac-footer {
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: #334155;
}

.ac-pct { color: #475569; }

/* ── City viewport ── */
.city-viewport {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 50%, #060c1a 0%, #030712 80%);
  padding: 12px;
  overflow: hidden;
}

.city-scene {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/*
  grid-wrap is the key fix: it gives both the city-grid and pop-overlay
  the exact same bounding box, so population dots map 1:1 over the grid.
*/
.grid-wrap {
  position: relative;
  /* Fill available space while keeping 30:20 aspect ratio */
  width: min(100%, calc((100vh - 76px) * 1.5));
  aspect-ratio: 30 / 20;
  border: 1px solid #1e293b;
  border-radius: 3px;
  overflow: hidden;
  box-shadow:
    0 0 40px rgba(59,130,246,.06),
    0 0 80px rgba(168,85,247,.03);
}

.city-grid {
  display: grid;
  width: 100%;
  height: 100%;
  gap: 1px;
  background: #0a0e1a;
}

/* ── Cells ── */
.cell {
  background: #07090f;
  transition: background 0.3s ease;
  position: relative;
  overflow: hidden;
}

.cell.pulse { animation: cell-pop 0.4s ease forwards; }

@keyframes cell-pop {
  0%   { transform: scale(0.4); filter: brightness(4); }
  55%  { transform: scale(1.1); }
  100% { transform: scale(1);   filter: brightness(1); }
}

/* Road */
.cell.road { background: #141b27; }
.cell.road::after {
  content: '';
  position: absolute;
  inset: 42% 0;
  background: #1c2535;
}

/* Residential */
.cell.residential,    .cell.residential.v0 { background: #92400e; }
.cell.residential.v1 { background: #7c3808; }
.cell.residential.v2 { background: #9c4c12; }
.cell.residential.v3 { background: #83380b; }

/* Commercial */
.cell.commercial,    .cell.commercial.v0 { background: #1d4ed8; }
.cell.commercial.v1 { background: #1e40af; }
.cell.commercial.v2 { background: #2563eb; }
.cell.commercial.v3 { background: #1c3fa0; }

/* Park */
.cell.park,    .cell.park.v0 { background: #15803d; }
.cell.park.v1 { background: #16a34a; }
.cell.park.v2 { background: #166534; }
.cell.park.v3 { background: #14532d; }
.cell.park::before {
  content: '';
  position: absolute;
  inset: 25%;
  background: rgba(74,222,128,.18);
  border-radius: 50%;
}

/* Skyscraper */
.cell.skyscraper,    .cell.skyscraper.v0 { background: #334155; }
.cell.skyscraper.v1 { background: #1e293b; }
.cell.skyscraper.v2 { background: #0f172a; }
.cell.skyscraper.v3 { background: #0d1b2a; }

.cell.skyscraper::before {
  content: '';
  position: absolute;
  inset: 8% 22% 25%;
  background: linear-gradient(180deg, rgba(147,197,253,.35) 0%, transparent 100%);
}

.cell.skyscraper.v0::before { background: linear-gradient(180deg, rgba(147,197,253,.4) 0%, transparent 100%); }
.cell.skyscraper.v1::before { background: linear-gradient(180deg, rgba(96,165,250,.4)  0%, transparent 100%); }
.cell.skyscraper.v2::before { background: linear-gradient(180deg, rgba(168,85,247,.4)  0%, transparent 100%); }
.cell.skyscraper.v3::before { background: linear-gradient(180deg, rgba(34,211,238,.35) 0%, transparent 100%); }

.cell.skyscraper::after {
  content: '';
  position: absolute;
  top: 5%;
  left: 50%;
  width: 2px;
  height: 10%;
  background: rgba(239,68,68,.85);
  transform: translateX(-50%);
  box-shadow: 0 0 5px rgba(239,68,68,.8);
}

/* ── Population overlay ── */
.pop-overlay {
  position: absolute;
  inset: 0;               /* covers the grid-wrap exactly */
  pointer-events: none;
  overflow: hidden;
}

.pop-dot {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.3s linear, top 0.3s linear;
}

/* ── Log panel ── */
.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-height: 0;
}

.log-item {
  display: grid;
  grid-template-columns: 26px 54px 1fr;
  gap: 4px;
  font-size: 8.5px;
  line-height: 1.5;
  padding: 2px 0;
  border-bottom: 1px solid #0d1117;
  animation: log-in 0.18s ease;
}

@keyframes log-in {
  from { opacity: 0; transform: translateY(-3px); }
  to   { opacity: 1; transform: translateY(0);    }
}

.li-time  { color: #1e293b; font-size: 7.5px; padding-top: 1px; }
.li-agent { font-weight: 700; font-size: 7.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.li-msg   { color: #475569; word-break: break-word; }

.log-item.success .li-msg { color: #22c55e; }
.log-item.system  .li-msg { color: #a855f7; }

/* Scrollbars */
::-webkit-scrollbar       { width: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
</style>
