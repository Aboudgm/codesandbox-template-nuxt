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
        <button class="term-action-btn" title="Decrease font" @click="changeFontSize(-1)"><i class="fas fa-search-minus"></i></button>
        <button class="term-action-btn" title="Increase font" @click="changeFontSize(1)"><i class="fas fa-search-plus"></i></button>
        <button class="term-action-btn" title="Clear terminal" @click="clearTerminal"><i class="fas fa-eraser"></i></button>
        <button class="term-action-btn" title="Copy selection" @click="copySelection"><i class="fas fa-copy"></i></button>
        <span :class="['term-status', termReady && connState === 'connected' ? 'ready' : 'waiting']">
          <span class="term-status-dot"></span>
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <!-- Terminal container -->
    <div class="term-wrap">
      <div ref="termContainer" class="term-container"></div>

      <!-- Offline overlay inside terminal -->
      <transition name="term-overlay">
        <div v-if="connState === 'reconnecting' || connState === 'offline'" class="term-offline">
          <div class="term-offline-card">
            <i :class="connState === 'reconnecting' ? 'fas fa-sync-alt fa-spin' : 'fas fa-unlink'"></i>
            <span>{{ connState === 'reconnecting' ? 'Reconnecting...' : 'Connection offline' }}</span>
            <span class="term-offline-hint">Terminal will resume automatically when connected</span>
          </div>
        </div>
      </transition>
    </div>

    <div class="term-statusbar">
      <span><i class="fas fa-keyboard"></i> Interactive shell</span>
      <span class="mono">{{ dimensions }}</span>
      <span class="mono">{{ fontSize }}px · xterm-256color</span>
      <span v-if="connState === 'connected'" class="status-live">
        <span class="live-dot"></span> Live
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'LicheeTerminal',
  inject: ['$toast'],
  props: {
    socket: { type: Object, required: true },
    connState: { type: String, default: 'connected' },
  },
  data() {
    return {
      term: null as any,
      fitAddon: null as any,
      termReady: false,
      dimensions: '80 × 24',
      fontSize: 13,
      resizeObserver: null as any,
      sshDataHandler: null as any,
      sshClosedHandler: null as any,
    }
  },
  computed: {
    statusLabel(): string {
      if (this.connState === 'reconnecting') return 'Reconnecting...'
      if (this.connState === 'offline') return 'Offline'
      return this.termReady ? 'Active' : 'Initializing...'
    },
  },
  watch: {
    connState(newState: string) {
      if (newState === 'connected' && !this.termReady) {
        this.initTerminal()
      }
    },
  },
  async mounted() {
    await this.$nextTick()
    await this.initTerminal()
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    cleanup() {
      if (this.resizeObserver) this.resizeObserver.disconnect()
      if (this.sshDataHandler) this.socket.off('ssh:data', this.sshDataHandler)
      if (this.sshClosedHandler) this.socket.off('ssh:closed', this.sshClosedHandler)
      if (this.term) this.term.dispose()
    },

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
            black: '#13111C', red: '#F87171', green: '#5EEAD4', yellow: '#FBBF24',
            blue: '#7CB0E8', magenta: '#C084FC', cyan: '#67E8F9', white: '#EDE8DE',
            brightBlack: '#352F48', brightRed: '#FCA5A5', brightGreen: '#99F6E4',
            brightYellow: '#FDE68A', brightBlue: '#BAD4F5', brightMagenta: '#D8B4FE',
            brightCyan: '#A5F3FC', brightWhite: '#FFFFFF',
          },
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          fontSize: this.fontSize,
          lineHeight: 1.42,
          cursorBlink: true,
          cursorStyle: 'block',
          scrollback: 3000,
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

        // Welcome banner
        term.writeln('\x1b[38;2;255;140;66m╔══════════════════════════════════════════════╗\x1b[0m')
        term.writeln('\x1b[38;2;255;140;66m║\x1b[0m  LicheeRV Nano · SSH Terminal                \x1b[38;2;255;140;66m║\x1b[0m')
        term.writeln('\x1b[38;2;255;140;66m║\x1b[0m  \x1b[38;2;94;234;212mSG2002 · RISC-V C906 · 256MB DDR3\x1b[0m         \x1b[38;2;255;140;66m║\x1b[0m')
        term.writeln('\x1b[38;2;255;140;66m╚══════════════════════════════════════════════╝\x1b[0m')
        term.writeln('')

        // Socket → terminal
        this.sshDataHandler = (data: string) => term.write(data)
        this.socket.on('ssh:data', this.sshDataHandler)

        this.sshClosedHandler = () => {
          term.writeln('\r\n\x1b[38;2;248;113;113m─── Connection closed ───\x1b[0m')
          this.termReady = false
        }
        this.socket.on('ssh:closed', this.sshClosedHandler)

        // Terminal → socket
        term.onData((data: string) => {
          if (this.connState === 'connected') {
            this.socket.emit('ssh:input', data)
          }
        })

        term.onResize(({ cols, rows }: any) => {
          this.dimensions = `${cols} × ${rows}`
          this.socket.emit('ssh:resize', { cols, rows })
        })

        this.socket.emit('ssh:resize', { cols, rows })

        this.resizeObserver = new (window as any).ResizeObserver(() => {
          try { fitAddon.fit() } catch (_) {}
        })
        this.resizeObserver.observe(this.$refs.termContainer as Element)

        // Re-emit size on reconnect
        this.socket.on('reconnect', () => {
          setTimeout(() => {
            if (this.term && this.fitAddon) {
              this.fitAddon.fit()
              const { cols, rows } = this.term
              this.socket.emit('ssh:resize', { cols, rows })
            }
          }, 500)
        })
      } catch (err) {
        console.error('Terminal init failed:', err)
      }
    },

    changeFontSize(delta: number) {
      if (!this.term) return
      this.fontSize = Math.min(20, Math.max(9, this.fontSize + delta))
      this.term.options.fontSize = this.fontSize
      try { this.fitAddon.fit() } catch (_) {}
    },

    clearTerminal() {
      if (this.term) this.term.clear()
    },

    copySelection() {
      if (this.term) {
        const sel = this.term.getSelection()
        if (sel) {
          navigator.clipboard.writeText(sel)
            .then(() => (this as any).$toast('Copied to clipboard', 'success'))
            .catch(() => {})
        }
      }
    },
  },
})
</script>

<style scoped>
.terminal-panel {
  display: flex; flex-direction: column;
  height: calc(100vh - 128px); min-height: 400px;
  background: #0A0812; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;
}

.term-toolbar {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 14px; background: #130F1E; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.term-dots { display: flex; gap: 6px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot-red { background: #F87171; } .dot-yellow { background: #FBBF24; } .dot-green { background: #5EEAD4; }

.term-title { flex: 1; font-size: 11px; color: var(--text-dim); display: flex; align-items: center; gap: 7px; font-family: 'JetBrains Mono', monospace; }
.term-title i { color: var(--accent); }
.term-actions { display: flex; align-items: center; gap: 6px; }
.term-action-btn { background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 11px; padding: 4px 8px; border-radius: 4px; transition: all 0.15s; }
.term-action-btn:hover { background: var(--card2); color: var(--text-dim); }

.term-status { display: flex; align-items: center; gap: 5px; font-size: 10px; padding: 3px 9px; border-radius: 10px; font-family: 'JetBrains Mono', monospace; }
.term-status.ready { background: var(--green-dim); color: var(--green); }
.term-status.waiting { background: var(--yellow-dim); color: var(--yellow); }
.term-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: pulse-dot 2s infinite; }
@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.term-wrap { flex: 1; position: relative; overflow: hidden; }
.term-container { width: 100%; height: 100%; padding: 6px 4px; }

/* Terminal offline overlay */
.term-offline {
  position: absolute; inset: 0;
  background: rgba(10,8,18,0.88); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; z-index: 10;
}
.term-offline-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 28px 36px; background: var(--card2); border: 1px solid var(--border2); border-radius: var(--radius);
  text-align: center;
}
.term-offline-card i { font-size: 28px; color: var(--yellow); }
.term-offline-card span { font-size: 14px; color: var(--text); font-weight: 600; }
.term-offline-hint { font-size: 11px; color: var(--text-faint) !important; font-weight: 400 !important; }

.term-overlay-enter-active { animation: fade-in 0.2s ease; }
.term-overlay-leave-active { animation: fade-out 0.15s ease forwards; }
@keyframes fade-in  { from { opacity: 0; } }
@keyframes fade-out { to   { opacity: 0; } }

.term-statusbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 14px; background: #130F1E; border-top: 1px solid var(--border);
  font-size: 10px; color: var(--text-faint); flex-shrink: 0;
}
.term-statusbar span { display: flex; align-items: center; gap: 5px; }
.term-statusbar i { font-size: 9px; color: var(--accent); }
.mono { font-family: 'JetBrains Mono', monospace; }
.status-live { color: var(--green); }
.live-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: pulse-dot 2s infinite; }
</style>
