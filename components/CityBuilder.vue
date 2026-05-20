<template>
  <div class="city-app">
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
      <aside class="side-panel left-panel">
        <div class="panel-header">AGENT SWARM</div>
        <div class="agents-list">
          <div
            v-for="ag in agentList"
            :key="ag.id"
            class="agent-card"
            :class="ag.status"
          >
            <div class="ac-top">
              <span class="ac-icon">{{ ag.icon }}</span>
              <div class="ac-body">
                <div class="ac-name">{{ ag.name }}</div>
                <div class="ac-status">{{ ag.statusText }}</div>
              </div>
              <div
                class="ac-dot"
                :class="ag.status"
                :style="ag.status === 'active' ? { background: ag.color, boxShadow: '0 0 8px ' + ag.color } : {}"
              ></div>
            </div>
            <div class="ac-progress-track">
              <div class="ac-progress-fill" :style="{ width: ag.progress + '%', background: ag.color }"></div>
            </div>
            <div class="ac-footer">
              <span>{{ ag.cellsPlaced }} cells placed</span>
            </div>
          </div>
        </div>
      </aside>

      <main class="city-viewport">
        <div class="city-scene">
          <div
            class="city-grid"
            ref="cityGrid"
            :style="{ gridTemplateColumns: 'repeat(' + COLS + ', 1fr)' }"
          >
            <div
              v-for="(cell, i) in grid"
              :key="i"
              class="cell"
              :class="[cell.type, 'v' + cell.variant, { pulse: cell.justPlaced }]"
            ></div>
          </div>
          <div class="pop-overlay">
            <div
              v-for="p in population"
              :key="p.id"
              class="pop-dot"
              :style="{
                left: ((p.col + 0.5) / COLS * 100) + '%',
                top: ((p.row + 0.5) / ROWS * 100) + '%',
                background: p.color,
                boxShadow: '0 0 5px ' + p.color
              }"
            ></div>
          </div>
        </div>
      </main>

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

export default Vue.extend({
  name: 'CityBuilder',

  data() {
    return {
      COLS,
      ROWS,
      grid: [] as Cell[],
      agents: {} as Record<string, AgentState>,
      logs: [] as LogEntry[],
      population: [] as Person[],
      phase: 'idle' as string,
      elapsed: 0,
      timers: [] as ReturnType<typeof setTimeout>[],
      intervals: [] as ReturnType<typeof setInterval>[],
      popIdCounter: 0,
    }
  },

  computed: {
    agentList(): AgentState[] {
      return Object.values(this.agents)
    },
    totalBuilt(): number {
      return this.grid.filter((c) => c.type !== 'empty').length
    },
    activeCount(): number {
      return this.agentList.filter((a) => a.status === 'active').length
    },
    phaseLabel(): string {
      const map: Record<string, string> = {
        idle: 'INITIALIZING',
        planning: 'PLANNING',
        roads: 'ROADS',
        zoning: 'ZONING',
        building: 'BUILDING',
        greening: 'GREENING',
        skyline: 'SKYLINE',
        populating: 'POPULATING',
        complete: 'COMPLETE',
      }
      return map[this.phase] || this.phase.toUpperCase()
    },
  },

  beforeDestroy() {
    this.clearAll()
  },

  methods: {
    clearAll() {
      this.timers.forEach(clearTimeout)
      this.intervals.forEach(clearInterval)
      this.timers = []
      this.intervals = []
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

    stopInterval(i: ReturnType<typeof setInterval>) {
      clearInterval(i)
      const idx = this.intervals.indexOf(i)
      if (idx !== -1) this.intervals.splice(idx, 1)
    },

    init() {
      const grid: Cell[] = []
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          grid.push({ type: 'empty', variant: Math.floor(Math.random() * 4), justPlaced: false })
        }
      }
      this.grid = grid

      this.agents = {
        orchestrator: { id: 'orchestrator', name: 'Orchestrator', icon: '🧠', color: '#a855f7', status: 'idle', statusText: 'Initializing...', progress: 0, cellsPlaced: 0 },
        roads: { id: 'roads', name: 'Road Network', icon: '🛣', color: '#64748b', status: 'idle', statusText: 'Standby', progress: 0, cellsPlaced: 0 },
        downtown: { id: 'downtown', name: 'Downtown Core', icon: '🏢', color: '#3b82f6', status: 'idle', statusText: 'Standby', progress: 0, cellsPlaced: 0 },
        residential: { id: 'residential', name: 'Residential', icon: '🏘', color: '#f59e0b', status: 'idle', statusText: 'Standby', progress: 0, cellsPlaced: 0 },
        parks: { id: 'parks', name: 'Parks & Green', icon: '🌳', color: '#22c55e', status: 'idle', statusText: 'Standby', progress: 0, cellsPlaced: 0 },
        skyscrapers: { id: 'skyscrapers', name: 'Skyscrapers', icon: '🏙', color: '#93c5fd', status: 'idle', statusText: 'Standby', progress: 0, cellsPlaced: 0 },
        population: { id: 'population', name: 'Population', icon: '👥', color: '#ec4899', status: 'idle', statusText: 'Standby', progress: 0, cellsPlaced: 0 },
      }
    },

    log(agentId: string, message: string, type: string = 'info') {
      const ag = this.agents[agentId]
      const color = ag ? ag.color : '#888'
      const now = new Date()
      const time = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      this.logs.unshift({ time, agentName: agentId.toUpperCase(), color, message, type })
      if (this.logs.length > 100) this.logs.pop()
    },

    cellIdx(col: number, row: number): number {
      return row * COLS + col
    },

    getCell(col: number, row: number): Cell | null {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
      return this.grid[this.cellIdx(col, row)]
    },

    placeCell(col: number, row: number, type: string, agentId: string) {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
      const idx = this.cellIdx(col, row)
      const existing = this.grid[idx]
      Vue.set(this.grid, idx, { type, variant: existing.variant, justPlaced: true })
      if (this.agents[agentId]) this.agents[agentId].cellsPlaced++
      this.after(() => {
        if (this.grid[idx] && this.grid[idx].type === type) {
          Vue.set(this.grid, idx, { ...this.grid[idx], justPlaced: false })
        }
      }, 500)
    },

    restart() {
      this.clearAll()
      this.logs = []
      this.population = []
      this.elapsed = 0
      this.phase = 'idle'
      this.popIdCounter = 0
      this.init()
      this.$nextTick(() => this.startSim())
    },

    startSim() {
      this.phase = 'planning'
      const tick = this.every(() => { this.elapsed++ }, 1000)

      const orc = this.agents.orchestrator
      orc.status = 'active'
      orc.statusText = 'Analyzing terrain...'
      this.log('orchestrator', 'System online. Analyzing terrain topology.', 'system')

      this.after(() => {
        this.log('orchestrator', 'Terrain analysis complete. Generating zone map.')
        orc.progress = 15
        orc.statusText = 'Generating zone map...'
      }, 600)

      this.after(() => {
        this.log('orchestrator', 'Dispatching Road Network agent.')
        orc.progress = 25
        this.runRoads()
      }, 1200)

      this.after(() => {
        this.log('orchestrator', 'Dispatching Downtown Core agent in parallel.')
        orc.progress = 40
        this.runDowntown()
      }, 2800)

      this.after(() => {
        this.log('orchestrator', 'Dispatching Residential agent.')
        orc.progress = 55
        this.runResidential()
      }, 5000)

      this.after(() => {
        this.log('orchestrator', 'Dispatching Parks & Green agent.')
        orc.progress = 70
        this.runParks()
      }, 8500)

      this.after(() => {
        this.log('orchestrator', 'Dispatching Skyscrapers agent.')
        orc.progress = 83
        this.runSkyscrapers()
      }, 12000)

      this.after(() => {
        this.log('orchestrator', 'Dispatching Population simulation agent.')
        orc.progress = 93
        this.runPopulation()
      }, 16000)

      this.after(() => {
        orc.progress = 100
        orc.status = 'complete'
        orc.statusText = 'All agents complete'
        this.phase = 'complete'
        this.log('orchestrator', '✓ City construction complete. All subagents finished.', 'success')
        clearInterval(tick)
      }, 32000)
    },

    runRoads() {
      const ag = this.agents.roads
      ag.status = 'active'
      ag.statusText = 'Laying primary arteries...'
      this.phase = 'roads'
      this.log('roads', 'Beginning road network construction.')

      const hRoads = [0, 4, 9, 14, 19]
      const vRoads = [0, 5, 10, 15, 20, 25, 29]
      const total = hRoads.length * COLS + vRoads.length * ROWS
      let done = 0

      hRoads.forEach((row, ri) => {
        this.after(() => {
          for (let col = 0; col < COLS; col++) {
            this.after(() => {
              this.placeCell(col, row, 'road', 'roads')
              done++
              ag.progress = Math.floor((done / total) * 100)
            }, col * 28)
          }
          this.log('roads', `Horizontal artery row ${row} complete.`)
        }, ri * 380)
      })

      const hDelay = hRoads.length * 380 + COLS * 28 + 100

      this.after(() => {
        ag.statusText = 'Laying vertical arteries...'
        this.log('roads', 'Switching to vertical arteries.')
        vRoads.forEach((col, ci) => {
          this.after(() => {
            for (let row = 0; row < ROWS; row++) {
              this.after(() => {
                this.placeCell(col, row, 'road', 'roads')
                done++
                ag.progress = Math.floor((done / total) * 100)
              }, row * 35)
            }
            this.log('roads', `Vertical artery col ${col} complete.`)
          }, ci * 280)
        })
      }, hDelay)

      const totalDelay = hDelay + vRoads.length * 280 + ROWS * 35 + 300
      this.after(() => {
        ag.status = 'complete'
        ag.statusText = `${ag.cellsPlaced} road segments`
        ag.progress = 100
        this.log('roads', `✓ Road network complete. ${ag.cellsPlaced} segments.`, 'success')
      }, totalDelay)
    },

    runDowntown() {
      const ag = this.agents.downtown
      ag.status = 'active'
      ag.statusText = 'Zoning commercial core...'
      this.phase = 'zoning'
      this.log('downtown', 'Identifying downtown zone.')

      const cx = Math.floor(COLS / 2)
      const cy = Math.floor(ROWS / 2)
      const r = 4

      const plots: [number, number][] = []
      for (let row = cy - r; row <= cy + r; row++) {
        for (let col = cx - r; col <= cx + r; col++) {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'empty') plots.push([col, row])
        }
      }

      this.log('downtown', `${plots.length} commercial plots identified.`)

      plots.forEach(([col, row], i) => {
        this.after(() => {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'empty') {
            this.placeCell(col, row, 'commercial', 'downtown')
            ag.progress = Math.floor(((i + 1) / plots.length) * 100)
          }
        }, i * 55 + Math.random() * 30)
      })

      this.after(() => {
        ag.status = 'complete'
        ag.statusText = `${ag.cellsPlaced} commercial buildings`
        ag.progress = 100
        this.log('downtown', `✓ Downtown core complete. ${ag.cellsPlaced} buildings.`, 'success')
      }, plots.length * 55 + 500)
    },

    runResidential() {
      const ag = this.agents.residential
      ag.status = 'active'
      ag.statusText = 'Filling residential zones...'
      this.phase = 'building'
      this.log('residential', 'Scanning city for empty residential plots.')

      const cx = Math.floor(COLS / 2)
      const cy = Math.floor(ROWS / 2)

      const empties: [number, number][] = []
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'empty') {
            const dist = Math.sqrt(Math.pow(col - cx, 2) + Math.pow(row - cy, 2))
            if (dist > 3.5) empties.push([col, row])
          }
        }
      }

      shuffle(empties)
      this.log('residential', `${empties.length} residential plots found.`)

      empties.forEach(([col, row], i) => {
        this.after(() => {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'empty') {
            this.placeCell(col, row, 'residential', 'residential')
            ag.progress = Math.floor(((i + 1) / empties.length) * 100)
          }
        }, i * 22 + Math.random() * 15)
      })

      this.after(() => {
        ag.status = 'complete'
        ag.statusText = `${ag.cellsPlaced} homes built`
        ag.progress = 100
        this.log('residential', `✓ Residential zones complete. ${ag.cellsPlaced} homes.`, 'success')
      }, empties.length * 22 + 600)
    },

    runParks() {
      const ag = this.agents.parks
      ag.status = 'active'
      ag.statusText = 'Planning green spaces...'
      this.phase = 'greening'
      this.log('parks', 'Analyzing city density for park allocation.')

      const candidates: [number, number][] = []
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'residential') {
            if ((col % 5 === 2 && row % 4 === 2) || Math.random() < 0.045) {
              candidates.push([col, row])
            }
          }
        }
      }

      this.log('parks', `${candidates.length} park sites selected.`)

      candidates.forEach(([col, row], i) => {
        this.after(() => {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'residential') {
            this.placeCell(col, row, 'park', 'parks')
            ag.progress = Math.floor(((i + 1) / candidates.length) * 100)
          }
        }, i * 110 + Math.random() * 60)
      })

      this.after(() => {
        ag.status = 'complete'
        ag.statusText = `${ag.cellsPlaced} parks planted`
        ag.progress = 100
        this.log('parks', `✓ Green infrastructure complete. ${ag.cellsPlaced} parks.`, 'success')
      }, candidates.length * 110 + 500)
    },

    runSkyscrapers() {
      const ag = this.agents.skyscrapers
      ag.status = 'active'
      ag.statusText = 'Identifying tower sites...'
      this.phase = 'skyline'
      this.log('skyscrapers', 'Scanning downtown for prime tower locations.')

      const cx = Math.floor(COLS / 2)
      const cy = Math.floor(ROWS / 2)

      const candidates: [number, number][] = []
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'commercial') {
            const dist = Math.sqrt(Math.pow(col - cx, 2) + Math.pow(row - cy, 2))
            if (dist <= 3.5 && Math.random() < 0.55) {
              candidates.push([col, row])
            }
          }
        }
      }

      this.log('skyscrapers', `${candidates.length} tower sites selected.`)

      candidates.forEach(([col, row], i) => {
        this.after(() => {
          const cell = this.getCell(col, row)
          if (cell && cell.type === 'commercial') {
            this.placeCell(col, row, 'skyscraper', 'skyscrapers')
            ag.progress = Math.floor(((i + 1) / candidates.length) * 100)
            this.log('skyscrapers', `Tower ${i + 1} erected at (${col}, ${row}).`)
          }
        }, i * 380)
      })

      this.after(() => {
        ag.status = 'complete'
        ag.statusText = `${ag.cellsPlaced} towers built`
        ag.progress = 100
        this.log('skyscrapers', `✓ Skyline complete. ${ag.cellsPlaced} skyscrapers.`, 'success')
      }, candidates.length * 380 + 500)
    },

    runPopulation() {
      const ag = this.agents.population
      ag.status = 'active'
      ag.statusText = 'Simulating citizens...'
      this.phase = 'populating'
      this.log('population', 'Initializing population simulation.')

      const maxPop = 60
      const colors = ['#ec4899', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4']
      let count = 0

      const roads = this.grid
        .map((c, i) => ({ c, col: i % COLS, row: Math.floor(i / COLS) }))
        .filter((x) => x.c.type === 'road')

      const spawnInterval = this.every(() => {
        if (count >= maxPop) {
          this.stopInterval(spawnInterval)
          ag.status = 'complete'
          ag.statusText = `${maxPop} citizens active`
          ag.progress = 100
          this.log('population', `✓ Population simulation running. ${maxPop} citizens.`, 'success')
          return
        }
        if (roads.length === 0) return
        const start = roads[Math.floor(Math.random() * roads.length)]
        this.population.push({
          id: this.popIdCounter++,
          col: start.col,
          row: start.row,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
        count++
        ag.cellsPlaced = count
        ag.progress = Math.floor((count / maxPop) * 100)
      }, 280)

      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
      this.every(() => {
        this.population = this.population.map((p) => {
          const moves = dirs.filter(([dc, dr]) => {
            const cell = this.getCell(p.col + dc, p.row + dr)
            return cell && cell.type === 'road'
          })
          if (moves.length > 0 && Math.random() < 0.7) {
            const [dc, dr] = moves[Math.floor(Math.random() * moves.length)]
            return { ...p, col: p.col + dc, row: p.row + dr }
          }
          return p
        })
      }, 300)
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

  mounted() {
    this.init()
    this.$nextTick(() => this.startSim())
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
  min-height: 100vh;
  height: 100vh;
  background: #030712;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
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
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.brand-icon { font-size: 22px; }

.brand-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.phase-tag {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  background: #1e293b;
  color: #64748b;
  border: 1px solid #334155;
  transition: all 0.4s;
}

.phase-tag.planning { background: rgba(168,85,247,.12); color: #a855f7; border-color: #a855f7; }
.phase-tag.roads    { background: rgba(100,116,139,.15); color: #94a3b8; border-color: #64748b; }
.phase-tag.zoning   { background: rgba(59,130,246,.12); color: #3b82f6; border-color: #3b82f6; }
.phase-tag.building { background: rgba(245,158,11,.12); color: #f59e0b; border-color: #f59e0b; }
.phase-tag.greening { background: rgba(34,197,94,.12);  color: #22c55e; border-color: #22c55e; }
.phase-tag.skyline  { background: rgba(147,197,253,.12); color: #93c5fd; border-color: #93c5fd; }
.phase-tag.populating { background: rgba(236,72,153,.12); color: #ec4899; border-color: #ec4899; }
.phase-tag.complete { background: rgba(34,197,94,.15); color: #4ade80; border-color: #22c55e; }

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-item { text-align: center; }

.stat-val {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1;
}

.stat-lbl {
  font-size: 9px;
  color: #475569;
  letter-spacing: 0.1em;
  margin-top: 2px;
}

.btn-restart {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 0.05em;
  transition: all 0.2s;
}

.btn-restart:hover {
  background: #334155;
  color: #f1f5f9;
}

/* ── Body ── */
.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ── Side panels ── */
.side-panel {
  width: 210px;
  flex-shrink: 0;
  background: #080d14;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-panel  { border-right: 1px solid #1e293b; }
.right-panel { border-left:  1px solid #1e293b; }

.panel-header {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #334155;
  padding: 12px 12px 8px;
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
  gap: 6px;
}

.agent-card {
  background: #0d1117;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 9px 10px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.agent-card.active {
  border-color: #1e40af;
  background: #0d1624;
}

.agent-card.complete {
  border-color: #1e293b;
  opacity: 0.7;
}

.ac-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}

.ac-icon { font-size: 16px; flex-shrink: 0; }

.ac-body { flex: 1; min-width: 0; }

.ac-name {
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
}

.ac-status {
  font-size: 9px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.ac-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #1e293b;
  transition: all 0.3s;
}

.ac-dot.active {
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.ac-dot.complete { background: #22c55e; }

.ac-progress-track {
  height: 3px;
  background: #1e293b;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 5px;
}

.ac-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.ac-footer {
  font-size: 9px;
  color: #334155;
}

/* ── City viewport ── */
.city-viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #050b18 0%, #030712 70%);
  padding: 16px;
  overflow: hidden;
}

.city-scene {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.city-grid {
  display: grid;
  gap: 1px;
  background: #0a0e1a;
  border: 1px solid #1e293b;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 0 60px rgba(59, 130, 246, 0.05), 0 0 120px rgba(168, 85, 247, 0.03);
  /* Fit within viewport while maintaining aspect ratio */
  width: min(calc(100% - 0px), calc((100vh - 115px) * 1.5));
  aspect-ratio: 30 / 20;
}

/* ── Cells ── */
.cell {
  background: #080d14;
  transition: background 0.35s ease;
  position: relative;
  overflow: hidden;
}

.cell.pulse {
  animation: cellPop 0.45s ease forwards;
}

@keyframes cellPop {
  0%   { transform: scale(0.5); filter: brightness(3); }
  60%  { transform: scale(1.12); }
  100% { transform: scale(1); filter: brightness(1); }
}

/* Road */
.cell.road { background: #111827; }
.cell.road::after {
  content: '';
  position: absolute;
  inset: 45% 0;
  background: #1f2937;
}

/* Residential */
.cell.residential    { background: #92400e; }
.cell.residential.v0 { background: #92400e; }
.cell.residential.v1 { background: #78350f; }
.cell.residential.v2 { background: #7c3e0f; }
.cell.residential.v3 { background: #9a4412; }

/* Commercial */
.cell.commercial    { background: #1e40af; }
.cell.commercial.v0 { background: #1d4ed8; }
.cell.commercial.v1 { background: #1e40af; }
.cell.commercial.v2 { background: #2563eb; }
.cell.commercial.v3 { background: #1e3a8a; }

/* Park */
.cell.park    { background: #15803d; }
.cell.park.v0 { background: #16a34a; }
.cell.park.v1 { background: #15803d; }
.cell.park.v2 { background: #166534; }
.cell.park.v3 { background: #14532d; }
.cell.park::before {
  content: '';
  position: absolute;
  inset: 20%;
  background: rgba(74, 222, 128, 0.15);
  border-radius: 50%;
}

/* Skyscraper */
.cell.skyscraper {
  background: #1e293b;
  box-shadow: inset 0 0 8px rgba(147, 197, 253, 0.2);
}
.cell.skyscraper.v0 { background: #334155; box-shadow: inset 0 0 10px rgba(147,197,253,.25); }
.cell.skyscraper.v1 { background: #1e293b; box-shadow: inset 0 0 10px rgba(96,165,250,.3); }
.cell.skyscraper.v2 { background: #0f172a; box-shadow: inset 0 0 12px rgba(168,85,247,.35); }
.cell.skyscraper.v3 { background: #0d1117; box-shadow: inset 0 0 12px rgba(34,211,238,.3); }
.cell.skyscraper::before {
  content: '';
  position: absolute;
  inset: 5% 25% 30%;
  background: linear-gradient(180deg, rgba(147,197,253,.4) 0%, transparent 80%);
}
.cell.skyscraper::after {
  content: '';
  position: absolute;
  top: 5%;
  left: 50%;
  width: 2px;
  height: 12%;
  background: rgba(239,68,68,.8);
  transform: translateX(-50%);
  box-shadow: 0 0 6px rgba(239,68,68,.8);
}

/* ── Population dots ── */
.pop-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pop-overlay {
  width: min(calc(100% - 0px), calc((100vh - 115px) * 1.5));
  aspect-ratio: 30 / 20;
  position: absolute;
}

.pop-dot {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.28s linear, top 0.28s linear;
}

/* ── Log panel ── */
.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log-item {
  display: grid;
  grid-template-columns: 28px 56px 1fr;
  gap: 4px;
  font-size: 9px;
  line-height: 1.5;
  padding: 2px 0;
  border-bottom: 1px solid #0d1117;
  animation: fadeSlide 0.2s ease;
}

@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(-3px); }
  to   { opacity: 1; transform: translateY(0); }
}

.li-time  { color: #1e293b; font-size: 8px; padding-top: 1px; }
.li-agent { font-weight: 700; font-size: 8px; }
.li-msg   { color: #64748b; word-break: break-word; }

.log-item.success .li-msg { color: #22c55e; }
.log-item.system  .li-msg { color: #a855f7; }

/* Scrollbar styling */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
</style>
