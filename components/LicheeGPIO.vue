<template>
  <div class="gpio-panel">
    <!-- Header -->
    <div class="gpio-toolbar">
      <span class="gpio-title"><i class="fas fa-plug"></i> GPIO Control</span>
      <button class="toolbar-btn" @click="refreshPins"><i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> Refresh</button>
    </div>

    <!-- Export new GPIO -->
    <div class="export-card">
      <div class="card-title"><i class="fas fa-plus-circle"></i> Export GPIO Pin</div>
      <div class="export-row">
        <div class="input-group">
          <label class="input-label">GPIO Number</label>
          <input v-model="newPin" class="pin-input" type="number" placeholder="e.g. 492" min="0" max="511" />
        </div>
        <button class="export-btn" :disabled="exporting || !newPin" @click="exportPin">
          <i class="fas fa-external-link-alt"></i>
          {{ exporting ? 'Exporting...' : 'Export & Set Output' }}
        </button>
      </div>
      <div v-if="exportError" class="export-error">{{ exportError }}</div>
      <div class="gpio-hint">
        <i class="fas fa-info-circle"></i>
        SG2002 GPIO numbers typically range from 480-511. Check your pinout for exact mappings.
      </div>
    </div>

    <!-- Pinout diagram -->
    <div class="pinout-card">
      <div class="card-title"><i class="fas fa-project-diagram"></i> LicheeRV Nano Header Pinout (2×14)</div>
      <div class="pinout-grid">
        <div class="pin-col pin-left">
          <div v-for="pin in leftPins" :key="pin.num" :class="['pin-row', pin.type]">
            <span class="pin-label">{{ pin.label }}</span>
            <span class="pin-func">{{ pin.func }}</span>
            <div :class="['pin-dot', pin.type]"></div>
          </div>
        </div>
        <div class="pin-col pin-right">
          <div v-for="pin in rightPins" :key="pin.num" :class="['pin-row', pin.type, 'row-right']">
            <div :class="['pin-dot', pin.type]"></div>
            <span class="pin-func">{{ pin.func }}</span>
            <span class="pin-label">{{ pin.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Exported GPIO controls -->
    <div class="controls-card">
      <div class="card-title">
        <i class="fas fa-toggle-on"></i> Exported GPIO Pins
        <span class="pin-count">{{ exportedPins.length }}</span>
      </div>

      <div v-if="loading && !exportedPins.length" class="pins-loading">
        <i class="fas fa-circle-notch fa-spin"></i> Scanning GPIO...
      </div>
      <div v-else-if="!exportedPins.length && !loading" class="pins-empty">
        <i class="fas fa-microchip"></i>
        No GPIO pins exported yet. Use the form above to export a pin.
      </div>
      <div v-else class="pins-grid">
        <div v-for="pin in exportedPins" :key="pin.num" class="gpio-ctrl-card">
          <div class="ctrl-header">
            <span class="ctrl-name mono">gpio{{ pin.num }}</span>
            <span :class="['dir-badge', pin.direction === 'out' ? 'out' : 'in']">
              <i :class="pin.direction === 'out' ? 'fas fa-arrow-right' : 'fas fa-arrow-left'"></i>
              {{ pin.direction }}
            </span>
          </div>
          <div class="ctrl-body">
            <div :class="['value-display', pin.value === 1 ? 'val-high' : 'val-low']">
              <i :class="pin.value === 1 ? 'fas fa-lightbulb' : 'far fa-lightbulb'"></i>
              <span>{{ pin.value === 1 ? 'HIGH' : 'LOW' }}</span>
            </div>
            <div v-if="pin.direction === 'out'" class="ctrl-btns">
              <button
                :class="['val-btn', pin.value === 1 ? 'active-high' : '']"
                @click="writePin(pin, 1)"
              >1 — ON</button>
              <button
                :class="['val-btn', pin.value === 0 ? 'active-low' : '']"
                @click="writePin(pin, 0)"
              >0 — OFF</button>
            </div>
            <div v-else class="read-only-badge">
              <i class="fas fa-eye"></i> Read-only input
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- GPIO Reference -->
    <div class="ref-card">
      <div class="card-title"><i class="fas fa-book"></i> sysfs GPIO Reference</div>
      <div class="ref-cmds">
        <div v-for="ref in gpioRefs" :key="ref.cmd" class="ref-item">
          <code class="ref-cmd">{{ ref.cmd }}</code>
          <span class="ref-desc">{{ ref.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

const PINOUT = [
  // [num, label, func, type] type: power|gnd|gpio|i2c|spi|uart|adc|dsi
  { num: 1, label: 'Pin 1', func: '3.3V', type: 'power' },
  { num: 3, label: 'Pin 3', func: 'I2C1 SDA', type: 'i2c' },
  { num: 5, label: 'Pin 5', func: 'I2C1 SCL', type: 'i2c' },
  { num: 7, label: 'Pin 7', func: 'GPIO / PWM', type: 'gpio' },
  { num: 9, label: 'Pin 9', func: 'GND', type: 'gnd' },
  { num: 11, label: 'Pin 11', func: 'UART0 TX', type: 'uart' },
  { num: 13, label: 'Pin 13', func: 'GPIO', type: 'gpio' },
  { num: 2, label: 'Pin 2', func: '5V', type: 'power' },
  { num: 4, label: 'Pin 4', func: '5V', type: 'power' },
  { num: 6, label: 'Pin 6', func: 'GND', type: 'gnd' },
  { num: 8, label: 'Pin 8', func: 'UART0 RX', type: 'uart' },
  { num: 10, label: 'Pin 10', func: 'GPIO', type: 'gpio' },
  { num: 12, label: 'Pin 12', func: 'SPI2 CLK', type: 'spi' },
  { num: 14, label: 'Pin 14', func: 'GND', type: 'gnd' },
]

export default Vue.extend({
  name: 'LicheeGPIO',
  props: { socketId: { type: String, required: true } },
  data() {
    return {
      exportedPins: [] as any[],
      loading: false,
      newPin: '' as any,
      exporting: false,
      exportError: '',
      gpioRefs: [
        { cmd: 'echo N > /sys/class/gpio/export', desc: 'Export GPIO N' },
        { cmd: 'echo out > /sys/class/gpio/gpioN/direction', desc: 'Set pin as output' },
        { cmd: 'echo in > /sys/class/gpio/gpioN/direction', desc: 'Set pin as input' },
        { cmd: 'echo 1 > /sys/class/gpio/gpioN/value', desc: 'Set HIGH (3.3V)' },
        { cmd: 'echo 0 > /sys/class/gpio/gpioN/value', desc: 'Set LOW (0V)' },
        { cmd: 'cat /sys/class/gpio/gpioN/value', desc: 'Read pin state' },
        { cmd: 'echo N > /sys/class/gpio/unexport', desc: 'Unexport GPIO N' },
        { cmd: 'ls /sys/class/gpio/', desc: 'List exported GPIOs' },
      ],
    }
  },
  computed: {
    leftPins(): any[] { return PINOUT.slice(0, 7) },
    rightPins(): any[] { return PINOUT.slice(7) },
  },
  mounted() { this.refreshPins() },
  methods: {
    async refreshPins() {
      this.loading = true
      try {
        const data = await this.$axios.$get('/api/gpio', {
          headers: { 'x-socket-id': this.socketId },
        })
        this.exportedPins = data.pins || []
      } catch (_) {}
      this.loading = false
    },
    async exportPin() {
      if (!this.newPin || this.exporting) return
      this.exporting = true
      this.exportError = ''
      try {
        await this.$axios.$post(
          '/api/gpio/export',
          { pin: parseInt(this.newPin) },
          { headers: { 'x-socket-id': this.socketId } }
        )
        this.newPin = ''
        await this.refreshPins()
      } catch (e: any) {
        this.exportError = e.response?.data?.error || e.message
      }
      this.exporting = false
    },
    async writePin(pin: any, value: number) {
      try {
        await this.$axios.$post(
          '/api/gpio/write',
          { pin: parseInt(pin.num), value },
          { headers: { 'x-socket-id': this.socketId } }
        )
        pin.value = value
      } catch (_) {}
    },
  },
})
</script>

<style scoped>
.gpio-panel { display: flex; flex-direction: column; gap: 16px; }

.gpio-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
}
.gpio-title { font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; }
.gpio-title i { color: var(--accent); }
.toolbar-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-dim); font-size: 12px; padding: 6px 12px; cursor: pointer; transition: all 0.15s;
}
.toolbar-btn:hover { background: var(--accent-dim); color: var(--accent); border-color: rgba(255,140,66,0.2); }

.export-card, .pinout-card, .controls-card, .ref-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px;
}
.card-title {
  font-size: 11px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px;
  display: flex; align-items: center; gap: 7px; margin-bottom: 14px;
}
.card-title i { color: var(--accent); }
.pin-count { background: var(--accent-dim); color: var(--accent); font-size: 10px; padding: 1px 6px; border-radius: 8px; }

.export-row { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 10px; }
.input-group { display: flex; flex-direction: column; gap: 5px; }
.input-label { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.5px; }
.pin-input {
  background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); font-size: 13px; padding: 8px 12px; width: 140px; outline: none;
  font-family: 'JetBrains Mono', monospace; transition: border-color 0.15s;
}
.pin-input:focus { border-color: rgba(255,140,66,0.3); }
.export-btn {
  display: flex; align-items: center; gap: 7px;
  background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.2); border-radius: 6px;
  color: var(--accent); font-size: 12px; font-weight: 500; padding: 9px 16px; cursor: pointer; transition: all 0.15s;
}
.export-btn:hover:not(:disabled) { background: rgba(255,140,66,0.25); }
.export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.export-error { font-size: 11px; color: var(--red); padding: 6px 10px; background: var(--red-dim); border-radius: 6px; margin-bottom: 6px; }
.gpio-hint { font-size: 11px; color: var(--text-faint); display: flex; align-items: flex-start; gap: 6px; padding: 8px; background: var(--blue-dim); border-radius: 6px; border: 1px solid rgba(124,176,232,0.15); }
.gpio-hint i { color: var(--blue); margin-top: 1px; flex-shrink: 0; }

/* Pinout */
.pinout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.pin-col { display: flex; flex-direction: column; gap: 3px; }
.pin-row {
  display: flex; align-items: center; gap: 8px; padding: 5px 8px;
  border-radius: 5px; background: var(--card2);
}
.pin-row.row-right { flex-direction: row-reverse; }
.pin-label { font-size: 9px; color: var(--text-faint); min-width: 40px; font-family: 'JetBrains Mono', monospace; }
.pin-func { font-size: 10px; color: var(--text-dim); flex: 1; }
.pin-row.row-right .pin-func { text-align: right; }
.pin-dot {
  width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
  box-shadow: 0 0 4px currentColor;
}
.pin-dot.power { background: #F87171; color: #F87171; }
.pin-dot.gnd { background: #5A5050; color: #5A5050; box-shadow: none; }
.pin-dot.gpio { background: #FF8C42; color: #FF8C42; }
.pin-dot.i2c { background: #7CB0E8; color: #7CB0E8; }
.pin-dot.spi { background: #C084FC; color: #C084FC; }
.pin-dot.uart { background: #5EEAD4; color: #5EEAD4; }
.pin-dot.adc { background: #FBBF24; color: #FBBF24; }

/* GPIO controls */
.pins-loading, .pins-empty {
  padding: 30px; text-align: center; color: var(--text-faint); font-size: 12px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.pins-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }

.gpio-ctrl-card {
  background: var(--card2); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden;
}
.ctrl-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; background: var(--bg); border-bottom: 1px solid var(--border);
}
.ctrl-name { font-size: 12px; font-weight: 600; color: var(--text); }
.dir-badge {
  font-size: 9px; padding: 2px 7px; border-radius: 8px; display: flex; align-items: center; gap: 4px;
}
.dir-badge.out { background: var(--accent-dim); color: var(--accent); }
.dir-badge.in { background: var(--blue-dim); color: var(--blue); }

.ctrl-body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.value-display {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700; padding: 8px;
  border-radius: var(--radius-sm); justify-content: center;
}
.value-display i { font-size: 18px; }
.val-high { background: rgba(94,234,212,0.1); color: var(--green); }
.val-low { background: var(--card); color: var(--text-faint); }

.ctrl-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.val-btn {
  padding: 7px; border-radius: 5px; border: 1px solid var(--border);
  background: var(--card); color: var(--text-dim); font-size: 11px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.val-btn:hover { background: var(--card2); }
.val-btn.active-high { background: var(--green-dim); border-color: rgba(94,234,212,0.3); color: var(--green); }
.val-btn.active-low { background: var(--red-dim); border-color: rgba(248,113,113,0.2); color: var(--red); }

.read-only-badge {
  font-size: 10px; color: var(--text-faint); text-align: center; padding: 6px;
  background: var(--card); border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 5px;
}

/* Reference */
.ref-cmds { display: flex; flex-direction: column; gap: 6px; }
.ref-item { display: flex; align-items: baseline; gap: 12px; padding: 7px 10px; background: var(--card2); border-radius: 5px; }
.ref-cmd { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--accent); flex-shrink: 0; }
.ref-desc { font-size: 11px; color: var(--text-faint); }

.mono { font-family: 'JetBrains Mono', monospace; }
</style>
