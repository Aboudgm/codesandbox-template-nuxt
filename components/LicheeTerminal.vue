<template>
  <div class="terminal-panel">
    <div class="term-toolbar">
      <div class="term-dots">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>
      <div class="term-title">
        <i class="fas fa-terminal"></i>
        SSH Terminal — LicheeRV Nano
      </div>
      <div class="term-actions">
        <button class="term-action-btn" title="Clear terminal" @click="clearTerminal">
          <i class="fas fa-eraser"></i>
        </button>
        <button class="term-action-btn" title="Copy selection" @click="copySelection">
          <i class="fas fa-copy"></i>
        </button>
        <span class="term-status" :class="termReady ? 'ready' : 'waiting'">
          <span class="term-status-dot"></span>
          {{ termReady ? 'Active' : 'Initializing...' }}
        </span>
      </div>
    </div>
    <div ref="termContainer" class="term-container"></div>
    <div class="term-statusbar">
      <span><i class="fas fa-keyboard"></i> Interactive shell</span>
      <span>{{ dimensions }}</span>
      <span>xterm-256color</span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'LicheeTerminal',
  props: {
    socket: { type: Object, required: true },
  },
  data() {
    return {
      term: null as any,
      fitAddon: null as any,
      termReady: false,
      dimensions: '80 × 24',
      resizeObserver: null as any,
    }
  },
  async mounted() {
    await this.$nextTick()
    await this.initTerminal()
  },
  beforeDestroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect()
    if (this.term) this.term.dispose()
  },
  methods: {
    async initTerminal() {
      try {
        const { Terminal } = await import('xterm')
        const { FitAddon } = await import('xterm-addon-fit')

        const term = new Terminal({
          theme: {
            background: '#0A0812',
            foreground: '#EDE8DE',
            cursor: '#FF8C42',
            cursorAccent: '#0A0812',
            selection: 'rgba(255,140,66,0.25)',
            black: '#13111C',
            red: '#F87171',
            green: '#5EEAD4',
            yellow: '#FBBF24',
            blue: '#7CB0E8',
            magenta: '#C084FC',
            cyan: '#67E8F9',
            white: '#EDE8DE',
            brightBlack: '#352F48',
            brightRed: '#FCA5A5',
            brightGreen: '#99F6E4',
            brightYellow: '#FDE68A',
            brightBlue: '#BAD4F5',
            brightMagenta: '#D8B4FE',
            brightCyan: '#A5F3FC',
            brightWhite: '#FFFFFF',
          },
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          fontSize: 13,
          lineHeight: 1.4,
          cursorBlink: true,
          cursorStyle: 'block',
          scrollback: 2000,
          convertEol: false,
          allowProposedApi: true,
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)

        term.open(this.$refs.termContainer as HTMLElement)
        fitAddon.fit()

        this.term = term
        this.fitAddon = fitAddon
        this.termReady = true

        const { cols, rows } = term
        this.dimensions = `${cols} × ${rows}`

        term.writeln('\x1b[38;2;255;140;66m╔══════════════════════════════════════════════════╗\x1b[0m')
        term.writeln('\x1b[38;2;255;140;66m║\x1b[0m  LicheeRV Nano — SSH Terminal                    \x1b[38;2;255;140;66m║\x1b[0m')
        term.writeln('\x1b[38;2;255;140;66m║\x1b[0m  \x1b[38;2;94;234;212mSipeed SG2002 · RISC-V · 256MB DDR3\x1b[0m           \x1b[38;2;255;140;66m║\x1b[0m')
        term.writeln('\x1b[38;2;255;140;66m╚══════════════════════════════════════════════════╝\x1b[0m')
        term.writeln('')

        // Socket data → terminal
        this.socket.on('ssh:data', (data: string) => {
          term.write(data)
        })

        this.socket.on('ssh:closed', () => {
          term.writeln('\r\n\x1b[38;2;248;113;113m[Connection closed]\x1b[0m')
          this.termReady = false
        })

        // Terminal input → socket
        term.onData((data: string) => {
          this.socket.emit('ssh:input', data)
        })

        // Resize
        term.onResize(({ cols, rows }: any) => {
          this.dimensions = `${cols} × ${rows}`
          this.socket.emit('ssh:resize', { cols, rows })
        })

        // Emit initial size
        this.socket.emit('ssh:resize', { cols, rows })

        // Auto-resize observer
        this.resizeObserver = new (window as any).ResizeObserver(() => {
          try {
            fitAddon.fit()
          } catch (_) {}
        })
        this.resizeObserver.observe(this.$refs.termContainer as Element)
      } catch (err) {
        console.error('Terminal init failed:', err)
      }
    },
    clearTerminal() {
      if (this.term) this.term.clear()
    },
    copySelection() {
      if (this.term) {
        const sel = this.term.getSelection()
        if (sel) navigator.clipboard.writeText(sel).catch(() => {})
      }
    },
  },
})
</script>

<style scoped>
.terminal-panel {
  display: flex; flex-direction: column;
  height: calc(100vh - 130px);
  min-height: 400px;
  background: #0A0812;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.term-toolbar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px;
  background: #130F1E;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.term-dots { display: flex; gap: 6px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot-red { background: #F87171; }
.dot-yellow { background: #FBBF24; }
.dot-green { background: #5EEAD4; }

.term-title {
  flex: 1; font-size: 12px; color: var(--text-dim);
  display: flex; align-items: center; gap: 7px;
  font-family: 'JetBrains Mono', monospace;
}
.term-title i { color: var(--accent); }

.term-actions { display: flex; align-items: center; gap: 8px; }
.term-action-btn {
  background: none; border: none; cursor: pointer;
  color: var(--text-faint); font-size: 11px; padding: 4px 8px;
  border-radius: 4px; transition: all 0.15s;
}
.term-action-btn:hover { background: var(--card2); color: var(--text-dim); }

.term-status {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; padding: 3px 10px;
  border-radius: 10px; font-family: 'JetBrains Mono', monospace;
}
.term-status.ready { background: var(--green-dim); color: var(--green); }
.term-status.waiting { background: var(--yellow-dim); color: var(--yellow); }
.term-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor; animation: pulse-dot 2s infinite;
}

.term-container {
  flex: 1; overflow: hidden; padding: 8px;
}

.term-statusbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 14px;
  background: #130F1E;
  border-top: 1px solid var(--border);
  font-size: 10px; color: var(--text-faint);
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}
.term-statusbar span { display: flex; align-items: center; gap: 5px; }
.term-statusbar i { font-size: 9px; color: var(--accent); }
</style>
