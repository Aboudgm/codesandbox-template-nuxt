<template>
  <div class="pc-panel">
    <!-- Hero -->
    <div class="pc-hero">
      <div class="pc-logo-wrap">
        <span class="pc-logo">🦞</span>
        <div>
          <div class="pc-title">PicoClaw <span class="pc-version">v0.2.8</span></div>
          <div class="pc-sub">Ultra-lightweight AI for LicheeRV Nano · ~10MB RAM</div>
        </div>
      </div>
      <div class="pc-hero-right">
        <span :class="['pc-status-pill', installed ? (gatewayRunning ? 'running' : 'idle') : 'missing']">
          <span class="pill-dot"></span>
          {{ installed ? (gatewayRunning ? 'Gateway Running' : 'Installed') : 'Not Installed' }}
        </span>
        <a v-if="gatewayRunning" :href="`http://${host}:18800`" target="_blank" class="webui-link">
          <i class="fas fa-external-link-alt"></i> Open WebUI
        </a>
      </div>
    </div>

    <!-- ── NOT INSTALLED ── -->
    <div v-if="!installed" class="pc-install-card">
      <div class="install-hero">
        <div class="install-icon"><i class="fas fa-download"></i></div>
        <div>
          <div class="install-title">Install PicoClaw on your Nano</div>
          <div class="install-desc">Downloads the RISC-V binary directly onto your device. Requires internet access on the Nano.</div>
        </div>
      </div>

      <div class="install-meta">
        <span class="meta-chip"><i class="fab fa-github"></i> sipeed/picoclaw v0.2.8</span>
        <span class="meta-chip"><i class="fas fa-microchip"></i> riscv64 binary</span>
        <span class="meta-chip"><i class="fas fa-weight-hanging"></i> ~20 MB</span>
        <span class="meta-chip"><i class="fas fa-memory"></i> ~10 MB RAM</span>
      </div>

      <!-- Internet check -->
      <div v-if="netCheckDone && !hasInternet" class="no-internet-warn">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <strong>No internet detected on the Nano.</strong> The Nano needs internet access to download picoclaw.
          <br>Enable internet sharing on your Mac (System Settings → Sharing → Internet Sharing) and share your Wi-Fi over Ethernet.
        </div>
      </div>

      <div class="install-actions">
        <button class="check-net-btn" :disabled="netChecking" @click="checkInternet">
          <i class="fas fa-satellite-dish" :class="{ 'fa-spin': netChecking }"></i>
          {{ netChecking ? 'Checking...' : 'Check Internet on Nano' }}
        </button>
        <button
          class="install-btn"
          :disabled="installing || (netCheckDone && !hasInternet)"
          @click="installPicoclaw"
        >
          <span v-if="!installing"><i class="fas fa-bolt"></i> Install PicoClaw</span>
          <span v-else><span class="spinner"></span> Installing...</span>
        </button>
      </div>

      <div v-if="installing || installLog" class="install-log-wrap">
        <div class="log-bar">
          <span class="mono accent">$ installing picoclaw...</span>
          <div v-if="installing" class="progress-track">
            <div class="progress-fill" :style="{ width: installProgress + '%' }"></div>
          </div>
        </div>
        <pre class="install-log">{{ installLog }}</pre>
      </div>
    </div>

    <!-- ── INSTALLED ── -->
    <template v-if="installed">
      <!-- Setup prompt if not configured -->
      <div v-if="!configured" class="setup-banner">
        <i class="fas fa-key"></i>
        <div>
          <strong>Configure an AI provider</strong> to start chatting.
          Set your API key below to use Claude, GPT, DeepSeek, Gemini, or any of 30+ providers.
        </div>
      </div>

      <!-- Main 2-col: Chat + Controls -->
      <div class="pc-main-grid">
        <!-- Quick Chat -->
        <div class="chat-card">
          <div class="card-title"><i class="fas fa-comment-dots"></i> Quick Chat</div>

          <div v-if="!configured" class="chat-disabled">
            <i class="fas fa-lock"></i>
            <span>Configure an API key first →</span>
          </div>
          <template v-else>
            <div class="chat-messages" ref="chatMessages">
              <div v-if="!chatHistory.length" class="chat-empty">
                <span class="pc-logo-sm">🦞</span>
                <span>Ask PicoClaw anything...</span>
              </div>
              <div v-for="(msg, i) in chatHistory" :key="i" :class="['chat-msg', msg.role]">
                <span class="msg-role">{{ msg.role === 'user' ? 'You' : '🦞 PicoClaw' }}</span>
                <pre class="msg-content">{{ msg.content }}</pre>
              </div>
              <div v-if="chatting" class="chat-msg assistant">
                <span class="msg-role">🦞 PicoClaw</span>
                <div class="typing-dots"><span></span><span></span><span></span></div>
              </div>
            </div>
            <div class="chat-input-row">
              <textarea
                v-model="chatInput"
                class="chat-input"
                placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
                :disabled="chatting"
                rows="2"
                @keydown.enter.exact.prevent="sendChat"
              ></textarea>
              <button class="send-btn" :disabled="chatting || !chatInput.trim()" @click="sendChat">
                <i :class="chatting ? 'fas fa-circle-notch fa-spin' : 'fas fa-paper-plane'"></i>
              </button>
            </div>
            <button v-if="chatHistory.length" class="clear-chat-btn" @click="chatHistory = []">
              <i class="fas fa-trash-alt"></i> Clear chat
            </button>
          </template>
        </div>

        <!-- Right column: Status + Config -->
        <div class="right-col">
          <!-- Gateway control -->
          <div class="gateway-card">
            <div class="card-title"><i class="fas fa-satellite-dish"></i> Gateway Service</div>
            <div class="gw-body">
              <div class="gw-status">
                <div :class="['gw-dot', gatewayRunning ? 'gw-on' : 'gw-off']"></div>
                <div class="gw-info">
                  <span class="gw-state">{{ gatewayRunning ? 'Running' : 'Stopped' }}</span>
                  <span class="gw-port" v-if="gatewayRunning">Port {{ gatewayPort }}</span>
                </div>
              </div>
              <div class="gw-btns">
                <button v-if="!gatewayRunning" class="gw-start-btn" :disabled="gwLoading" @click="startGateway">
                  <i class="fas fa-play"></i> Start
                </button>
                <template v-else>
                  <button class="gw-stop-btn" :disabled="gwLoading" @click="stopGateway">
                    <i class="fas fa-stop"></i> Stop
                  </button>
                  <button class="gw-restart-btn" :disabled="gwLoading" @click="restartGateway">
                    <i class="fas fa-redo"></i>
                  </button>
                </template>
              </div>
            </div>
            <div class="gw-note">
              <i class="fas fa-info-circle"></i>
              Gateway runs at <code>127.0.0.1:{{ gatewayPort }}</code>. WebUI at <code>:{{ webUIPort }}</code>.
            </div>
          </div>

          <!-- Config -->
          <div class="config-card">
            <div class="card-title"><i class="fas fa-cog"></i> AI Provider</div>
            <div class="config-form">
              <div class="cf-row">
                <label>Provider</label>
                <select v-model="provider" class="cf-select">
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="ollama">Ollama (local)</option>
                  <option value="custom">Custom / OpenAI-compat</option>
                </select>
              </div>
              <div class="cf-row">
                <label>Model</label>
                <input v-model="modelInput" class="cf-input mono" :placeholder="(providerDefaults[provider] && providerDefaults[provider].model) || 'model-name'" />
              </div>
              <div class="cf-row" v-if="provider !== 'ollama'">
                <label>API Key</label>
                <div class="input-wrap-sm">
                  <input v-model="apiKeyInput" :type="showKey ? 'text' : 'password'" class="cf-input mono" placeholder="sk-..." />
                  <button class="key-toggle" @click="showKey = !showKey"><i :class="showKey ? 'fas fa-eye-slash' : 'fas fa-eye'"></i></button>
                </div>
              </div>
              <div class="cf-row" v-if="provider === 'ollama' || provider === 'custom'">
                <label>Base URL</label>
                <input v-model="apiBase" class="cf-input mono" placeholder="http://localhost:11434/v1" />
              </div>
            </div>
            <button class="save-config-btn" :disabled="savingConfig" @click="saveConfig">
              <i :class="savingConfig ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
              {{ savingConfig ? 'Saving...' : 'Save & Apply' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Logs -->
      <div class="logs-card">
        <div class="card-title">
          <i class="fas fa-scroll"></i> Logs
          <button class="tiny-btn ml-auto" @click="refreshLogs"><i class="fas fa-sync-alt" :class="{ 'fa-spin': logsLoading }"></i></button>
          <button class="tiny-btn" @click="showLogs = !showLogs">{{ showLogs ? 'Hide' : 'Show' }}</button>
        </div>
        <pre v-if="showLogs" class="pc-log-pre">{{ logs || 'No logs yet. Start the gateway to see activity.' }}</pre>
      </div>

      <!-- Command reference -->
      <div class="cmds-card">
        <div class="card-title"><i class="fas fa-book-open"></i> CLI Reference</div>
        <div class="cmds-grid">
          <div v-for="cmd in cliCmds" :key="cmd.cmd" class="cmd-ref-row">
            <code class="cmd-code" @click="copyCmd(cmd.cmd)">{{ cmd.cmd }}</code>
            <span class="cmd-desc">{{ cmd.desc }}</span>
            <button class="run-ref-btn" :title="'Run: ' + cmd.cmd" @click="runRefCmd(cmd)">
              <i class="fas fa-play"></i>
            </button>
          </div>
        </div>
        <div v-if="refOutput" class="ref-output">
          <div class="ref-out-bar">
            <span class="mono accent">$ {{ lastRefCmd }}</span>
            <button class="tiny-btn" @click="refOutput = ''"><i class="fas fa-times"></i></button>
          </div>
          <pre class="ref-pre">{{ refOutput }}</pre>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

const RELEASE = 'v0.2.8'
const DL_URL = `https://github.com/sipeed/picoclaw/releases/download/${RELEASE}/picoclaw_Linux_riscv64.tar.gz`

export default Vue.extend({
  name: 'LicheePicoClaw',
  inject: ['$toast'],
  props: {
    socketId: { type: String, required: true },
    host: { type: String, default: '' },
  },
  data() {
    return {
      // State
      installed: false,
      version: '',
      configured: false,
      checking: true,

      // Installation
      installing: false,
      installLog: '',
      installProgress: 0,
      netChecking: false,
      netCheckDone: false,
      hasInternet: false,

      // Gateway
      gatewayRunning: false,
      gwLoading: false,
      gatewayPort: 18790,
      webUIPort: 18800,

      // Chat
      chatInput: '',
      chatHistory: [] as any[],
      chatting: false,

      // Config
      provider: 'anthropic',
      modelInput: '',
      apiKeyInput: '',
      apiBase: '',
      showKey: false,
      savingConfig: false,

      // Logs
      logs: '',
      showLogs: false,
      logsLoading: false,

      // Ref commands
      refOutput: '',
      lastRefCmd: '',

      providerDefaults: {
        anthropic: { model: 'claude-opus-4-7', key: 'sk-ant-...' },
        openai:    { model: 'gpt-4o', key: 'sk-...' },
        deepseek:  { model: 'deepseek-chat', key: 'sk-...' },
        google:    { model: 'gemini-2.0-flash', key: 'AIza...' },
        ollama:    { model: 'llama3.1:8b', base: 'http://localhost:11434/v1' },
        custom:    { model: 'your-model', base: 'http://your-server/v1' },
      } as any,

      cliCmds: [
        { cmd: 'picoclaw version', desc: 'Show installed version' },
        { cmd: 'picoclaw status', desc: 'Display current status' },
        { cmd: 'picoclaw onboard', desc: 'Interactive first-time setup' },
        { cmd: 'picoclaw agent -m "Hello!"', desc: 'One-shot AI query' },
        { cmd: 'picoclaw gateway', desc: 'Start background gateway (port 18790)' },
        { cmd: 'picoclaw mcp list', desc: 'List configured MCP servers' },
        { cmd: 'picoclaw skills list', desc: 'Show installed skills' },
        { cmd: 'picoclaw model', desc: 'View / change default model' },
      ],
    }
  },
  watch: {
    provider(val: string) {
      const def = this.providerDefaults[val]
      if (def) {
        if (!this.modelInput) this.modelInput = def.model || ''
        if (def.base && !this.apiBase) this.apiBase = def.base
      }
    },
  },
  mounted() {
    this.checkStatus()
  },
  methods: {
    async exec(cmd: string): Promise<string> {
      const { data } = await this.$axios.post(
        '/api/exec',
        { command: cmd },
        { headers: { 'x-socket-id': this.socketId } }
      )
      return data.output || ''
    },

    async checkStatus() {
      this.checking = true
      try {
        const out = await this.exec('which picoclaw > /dev/null 2>&1 && picoclaw version 2>/dev/null && echo "PC_OK" || echo "PC_MISSING"')
        this.installed = out.includes('PC_OK')
        if (this.installed) {
          const vMatch = out.match(/[\d]+\.[\d]+\.[\d]+/)
          this.version = vMatch ? vMatch[0] : RELEASE.replace('v','')
          await this.checkGatewayStatus()
          await this.checkConfig()
        }
      } catch (_) {}
      this.checking = false
    },

    async checkGatewayStatus() {
      const out = await this.exec("pgrep -f 'picoclaw gateway' > /dev/null 2>&1 && echo RUNNING || echo STOPPED")
      this.gatewayRunning = out.includes('RUNNING')
    },

    async checkConfig() {
      const out = await this.exec("cat ~/.picoclaw/config.json 2>/dev/null || echo 'NOT_FOUND'")
      this.configured = !out.includes('NOT_FOUND') && out.includes('model')
      if (this.configured) {
        try {
          const cfg = JSON.parse(out)
          const first = cfg.model_list?.[0]
          if (first) {
            const parts = (first.model || '').split('/')
            if (parts.length === 2) {
              this.provider = parts[0]
              this.modelInput = parts[1]
            }
            if (first.api_base) this.apiBase = first.api_base
          }
        } catch (_) {}
      }
    },

    async checkInternet() {
      this.netChecking = true
      try {
        const out = await this.exec("ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1 && echo OK || curl -s --max-time 3 https://github.com > /dev/null 2>&1 && echo OK || echo FAIL")
        this.hasInternet = out.includes('OK')
        this.netCheckDone = true
        if (this.hasInternet) {
          (this as any).$toast('Internet access confirmed on the Nano', 'success')
        } else {
          (this as any).$toast('No internet on the Nano — enable Internet Sharing on your Mac', 'warning')
        }
      } catch (_) {}
      this.netChecking = false
    },

    async installPicoclaw() {
      this.installing = true
      this.installLog = ''
      this.installProgress = 5

      const steps = [
        { label: 'Downloading picoclaw RISC-V binary...', progress: 10,
          cmd: `wget -q "${DL_URL}" -O /tmp/pc.tar.gz 2>&1 || curl -sL "${DL_URL}" -o /tmp/pc.tar.gz 2>&1 && echo DL_OK` },
        { label: 'Extracting...', progress: 70,
          cmd: 'tar -xzf /tmp/pc.tar.gz -C /tmp/ 2>&1 && echo EX_OK' },
        { label: 'Installing to /usr/local/bin...', progress: 85,
          cmd: 'mv /tmp/picoclaw /usr/local/bin/picoclaw 2>&1 && chmod +x /usr/local/bin/picoclaw 2>&1 && echo MV_OK' },
        { label: 'Cleaning up...', progress: 95,
          cmd: 'rm -f /tmp/pc.tar.gz && echo CLEAN_OK' },
        { label: 'Verifying installation...', progress: 98,
          cmd: 'picoclaw version 2>&1 && echo VERIFY_OK' },
      ]

      let success = true
      for (const step of steps) {
        this.installLog += `\n→ ${step.label}\n`
        this.installProgress = step.progress
        const out = await this.exec(step.cmd)
        this.installLog += out + '\n'
        if (!out.includes('OK')) {
          this.installLog += '\n✗ Step failed. Check internet connection on the Nano.\n'
          success = false
          break
        }
      }

      if (success) {
        this.installProgress = 100
        this.installLog += '\n✓ PicoClaw installed successfully!\n'
        ;(this as any).$toast('PicoClaw installed!', 'success')
        await this.checkStatus()
      } else {
        ;(this as any).$toast('Installation failed — check the log', 'error')
      }

      this.installing = false
    },

    async saveConfig() {
      this.savingConfig = true
      try {
        const providerKey = this.provider
        const model = this.modelInput || this.providerDefaults[providerKey]?.model || 'default'
        const modelStr = `${providerKey}/${model}`

        const config: any = {
          agents: { defaults: { model_name: 'main' } },
          model_list: [{
            model_name: 'main',
            model: modelStr,
          }],
        }

        if (this.apiBase) config.model_list[0].api_base = this.apiBase

        const cfgJson = JSON.stringify(config, null, 2).replace(/'/g, "'\\''")

        // Write config file
        await this.exec(`mkdir -p ~/.picoclaw && printf '%s' '${cfgJson}' > ~/.picoclaw/config.json && echo CFG_OK`)

        // Write API key to environment / security file if provided
        if (this.apiKeyInput) {
          const envVarMap: Record<string, string> = {
            anthropic: 'ANTHROPIC_API_KEY',
            openai: 'OPENAI_API_KEY',
            deepseek: 'DEEPSEEK_API_KEY',
            google: 'GOOGLE_API_KEY',
          }
          const envVar = envVarMap[this.provider]
          if (envVar) {
            await this.exec(`grep -qxF 'export ${envVar}="${this.apiKeyInput}"' ~/.bashrc 2>/dev/null || echo 'export ${envVar}="${this.apiKeyInput}"' >> ~/.bashrc && echo KEY_OK`)
          }
        }

        this.configured = true
        ;(this as any).$toast('Config saved! API key added to ~/.bashrc', 'success')
      } catch (e: any) {
        ;(this as any).$toast('Config save failed: ' + e.message, 'error')
      }
      this.savingConfig = false
    },

    async sendChat() {
      const msg = this.chatInput.trim()
      if (!msg || this.chatting) return
      this.chatHistory.push({ role: 'user', content: msg })
      this.chatInput = ''
      this.chatting = true
      await this.$nextTick()
      this.scrollChat()
      try {
        const safeMsg = msg.replace(/'/g, "'\\''").replace(/"/g, '\\"').slice(0, 400)
        const out = await this.exec(`picoclaw agent -m "${safeMsg}" 2>&1`)
        this.chatHistory.push({ role: 'assistant', content: out || '(no response)' })
      } catch (e: any) {
        this.chatHistory.push({ role: 'assistant', content: '⚠ Error: ' + e.message })
      }
      this.chatting = false
      await this.$nextTick()
      this.scrollChat()
    },

    scrollChat() {
      const el = this.$refs.chatMessages as HTMLElement
      if (el) el.scrollTop = el.scrollHeight
    },

    async startGateway() {
      this.gwLoading = true
      await this.exec('nohup picoclaw gateway > /tmp/picoclaw-gw.log 2>&1 & echo $! > /tmp/picoclaw-gw.pid')
      await new Promise(r => setTimeout(r, 1500))
      await this.checkGatewayStatus()
      if (this.gatewayRunning) (this as any).$toast('PicoClaw gateway started on port ' + this.gatewayPort, 'success')
      this.gwLoading = false
    },

    async stopGateway() {
      this.gwLoading = true
      await this.exec("kill $(cat /tmp/picoclaw-gw.pid 2>/dev/null) 2>/dev/null || pkill -f 'picoclaw gateway' 2>/dev/null; echo done")
      await new Promise(r => setTimeout(r, 800))
      await this.checkGatewayStatus()
      ;(this as any).$toast('Gateway stopped', 'info')
      this.gwLoading = false
    },

    async restartGateway() {
      await this.stopGateway()
      await this.startGateway()
    },

    async refreshLogs() {
      this.logsLoading = true
      this.logs = await this.exec('tail -60 /tmp/picoclaw-gw.log 2>/dev/null || tail -60 /tmp/picoclaw.log 2>/dev/null || echo "No log file found yet."')
      this.showLogs = true
      this.logsLoading = false
    },

    async runRefCmd(cmd: any) {
      this.lastRefCmd = cmd.cmd
      this.refOutput = 'Running...'
      this.refOutput = await this.exec(cmd.cmd + ' 2>&1 | head -40')
    },

    async copyCmd(cmd: string) {
      await navigator.clipboard.writeText(cmd).catch(() => {})
      ;(this as any).$toast('Command copied', 'info')
    },
  },
})
</script>

<style scoped>
.pc-panel { display: flex; flex-direction: column; gap: 16px; }

/* ── HERO ── */
.pc-hero {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  background: linear-gradient(135deg, #1A1826 0%, #1E1B2E 100%);
  border-top: 2px solid var(--accent);
}
.pc-logo-wrap { display: flex; align-items: center; gap: 14px; }
.pc-logo { font-size: 32px; filter: drop-shadow(0 0 8px rgba(255,140,66,0.4)); }
.pc-title { font-size: 18px; font-weight: 700; color: var(--text); }
.pc-version { font-size: 12px; font-weight: 500; color: var(--accent); background: var(--accent-dim); padding: 2px 8px; border-radius: 10px; margin-left: 6px; }
.pc-sub { font-size: 11px; color: var(--text-dim); margin-top: 2px; }

.pc-hero-right { display: flex; align-items: center; gap: 10px; }
.pc-status-pill { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.pc-status-pill.running { background: var(--green-dim); color: var(--green); border: 1px solid rgba(94,234,212,0.2); }
.pc-status-pill.idle    { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(124,176,232,0.2); }
.pc-status-pill.missing { background: var(--red-dim); color: var(--red); border: 1px solid rgba(248,113,113,0.2); }
.pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse-dot 2s infinite; }
@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }

.webui-link {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.25); border-radius: var(--radius-sm);
  color: var(--accent); font-size: 12px; font-weight: 600; text-decoration: none; transition: all 0.15s;
}
.webui-link:hover { background: rgba(255,140,66,0.25); }

/* ── INSTALL ── */
.pc-install-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
}
.install-hero { display: flex; align-items: flex-start; gap: 16px; }
.install-icon {
  width: 48px; height: 48px; border-radius: 12px; background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.2);
  display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--accent); flex-shrink: 0;
}
.install-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.install-desc { font-size: 12px; color: var(--text-dim); }

.install-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.meta-chip { display: flex; align-items: center; gap: 5px; padding: 3px 9px; background: var(--card2); border: 1px solid var(--border); border-radius: 20px; font-size: 10px; color: var(--text-dim); }
.meta-chip i { font-size: 9px; color: var(--accent); }

.no-internet-warn {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; background: var(--yellow-dim); border: 1px solid rgba(251,191,36,0.2); border-radius: var(--radius-sm);
  font-size: 12px; color: var(--text-dim);
}
.no-internet-warn i { color: var(--yellow); flex-shrink: 0; margin-top: 2px; }

.install-actions { display: flex; gap: 10px; }
.check-net-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 16px; background: var(--card2); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-dim); font-size: 12px; cursor: pointer; transition: all 0.15s;
}
.check-net-btn:hover:not(:disabled) { background: var(--blue-dim); color: var(--blue); border-color: rgba(124,176,232,0.2); }
.check-net-btn:disabled { opacity: 0.5; cursor: wait; }
.install-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 20px; background: linear-gradient(135deg, var(--accent), #E07530); border: none; border-radius: var(--radius-sm);
  color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  box-shadow: 0 4px 16px rgba(255,140,66,0.3);
}
.install-btn:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(255,140,66,0.45); transform: translateY(-1px); }
.install-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.install-log-wrap { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.log-bar { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: var(--card2); border-bottom: 1px solid var(--border); gap: 12px; }
.progress-track { flex: 1; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; max-width: 180px; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s ease; }
.install-log { padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-dim); white-space: pre-wrap; max-height: 200px; overflow-y: auto; margin: 0; }

/* ── SETUP BANNER ── */
.setup-banner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 16px; background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.2); border-radius: var(--radius-sm);
  font-size: 12px; color: var(--text-dim);
}
.setup-banner i { color: var(--accent); flex-shrink: 0; margin-top: 2px; font-size: 14px; }
.setup-banner strong { color: var(--text); }

/* ── MAIN GRID ── */
.pc-main-grid { display: grid; grid-template-columns: 1fr 340px; gap: 14px; }

/* ── CHAT ── */
.chat-card, .gateway-card, .config-card, .logs-card, .cmds-card {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px;
}
.card-title { font-size: 11px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 7px; margin-bottom: 12px; }
.card-title i { color: var(--accent); font-size: 11px; }

.chat-disabled { display: flex; align-items: center; gap: 8px; padding: 20px; color: var(--text-faint); font-size: 13px; justify-content: center; }
.chat-messages { min-height: 160px; max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.chat-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 30px; color: var(--text-faint); font-size: 13px; height: 100%; }
.pc-logo-sm { font-size: 28px; }
.chat-msg { display: flex; flex-direction: column; gap: 3px; }
.chat-msg.user { align-items: flex-end; }
.chat-msg.assistant { align-items: flex-start; }
.msg-role { font-size: 10px; color: var(--text-faint); font-weight: 600; padding: 0 4px; }
.msg-content {
  padding: 9px 12px; border-radius: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px;
  white-space: pre-wrap; word-break: break-word; max-width: 90%; margin: 0;
}
.chat-msg.user .msg-content { background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.2); color: var(--text); border-bottom-right-radius: 3px; }
.chat-msg.assistant .msg-content { background: var(--card2); border: 1px solid var(--border); color: var(--text); border-bottom-left-radius: 3px; }

.typing-dots { display: flex; gap: 4px; padding: 10px 14px; background: var(--card2); border: 1px solid var(--border); border-radius: 10px; border-bottom-left-radius: 3px; }
.typing-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--text-faint); animation: typing 1.4s ease infinite; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }

.chat-input-row { display: flex; gap: 8px; align-items: flex-end; }
.chat-input {
  flex: 1; resize: none; background: var(--card2); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text); font-size: 12px; padding: 9px 12px; outline: none; font-family: 'Inter', sans-serif;
  transition: border-color 0.15s;
}
.chat-input:focus { border-color: rgba(255,140,66,0.35); }
.chat-input::placeholder { color: var(--text-faint); }
.send-btn {
  width: 38px; height: 38px; border-radius: var(--radius-sm); border: none;
  background: var(--accent); color: #fff; font-size: 13px; cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.send-btn:hover:not(:disabled) { background: var(--accent-hover); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.clear-chat-btn { display: flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 10px; padding: 4px; margin-top: 4px; transition: color 0.15s; }
.clear-chat-btn:hover { color: var(--red); }

/* ── RIGHT COL ── */
.right-col { display: flex; flex-direction: column; gap: 12px; }

.gateway-card { flex-shrink: 0; }
.gw-body { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.gw-status { display: flex; align-items: center; gap: 10px; }
.gw-dot { width: 12px; height: 12px; border-radius: 50%; }
.gw-dot.gw-on  { background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse-dot 2s infinite; }
.gw-dot.gw-off { background: var(--text-faint); }
.gw-info { display: flex; flex-direction: column; }
.gw-state { font-size: 13px; font-weight: 600; color: var(--text); }
.gw-port  { font-size: 10px; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }
.gw-btns { display: flex; gap: 6px; }
.gw-start-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: var(--green-dim); border: 1px solid rgba(94,234,212,0.2); border-radius: 6px;
  color: var(--green); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.gw-start-btn:hover:not(:disabled) { background: rgba(94,234,212,0.2); }
.gw-stop-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: var(--red-dim); border: 1px solid rgba(248,113,113,0.2); border-radius: 6px;
  color: var(--red); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.gw-stop-btn:hover:not(:disabled) { background: rgba(248,113,113,0.2); }
.gw-restart-btn {
  padding: 7px 10px; background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-dim); font-size: 12px; cursor: pointer; transition: all 0.15s;
}
.gw-restart-btn:hover:not(:disabled) { background: var(--yellow-dim); color: var(--yellow); }
.gw-start-btn:disabled, .gw-stop-btn:disabled, .gw-restart-btn:disabled { opacity: 0.5; cursor: wait; }
.gw-note { font-size: 10px; color: var(--text-faint); display: flex; align-items: center; gap: 5px; }
.gw-note i { color: var(--blue); font-size: 9px; }
.gw-note code { font-family: 'JetBrains Mono', monospace; background: var(--border); padding: 1px 4px; border-radius: 3px; color: var(--text-dim); }

/* Config form */
.config-form { display: flex; flex-direction: column; gap: 9px; margin-bottom: 12px; }
.cf-row { display: flex; flex-direction: column; gap: 4px; }
.cf-row label { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.5px; }
.cf-select, .cf-input {
  background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); font-size: 11px; padding: 7px 9px; outline: none; width: 100%; transition: border-color 0.15s;
}
.cf-select { cursor: pointer; }
.cf-input { font-family: 'JetBrains Mono', monospace; }
.cf-select:focus, .cf-input:focus { border-color: rgba(255,140,66,0.35); }
.cf-input::placeholder { color: var(--text-faint); }
.mono { font-family: 'JetBrains Mono', monospace; }
.input-wrap-sm { position: relative; display: flex; align-items: center; }
.input-wrap-sm .cf-input { padding-right: 30px; }
.key-toggle { position: absolute; right: 7px; background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 10px; }
.key-toggle:hover { color: var(--text-dim); }
.save-config-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 9px; background: var(--accent-dim); border: 1px solid rgba(255,140,66,0.2); border-radius: 6px;
  color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.save-config-btn:hover:not(:disabled) { background: rgba(255,140,66,0.25); }
.save-config-btn:disabled { opacity: 0.5; cursor: wait; }

/* ── LOGS ── */
.pc-log-pre { padding: 12px 14px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-dim); white-space: pre-wrap; max-height: 200px; overflow-y: auto; margin: 0; }

/* ── COMMANDS ── */
.cmds-grid { display: flex; flex-direction: column; gap: 4px; }
.cmd-ref-row { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 6px; transition: background 0.1s; }
.cmd-ref-row:hover { background: var(--card2); }
.cmd-code { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--accent); background: var(--accent-dim); padding: 2px 7px; border-radius: 4px; cursor: pointer; flex-shrink: 0; white-space: nowrap; }
.cmd-code:hover { background: rgba(255,140,66,0.25); }
.cmd-desc { font-size: 11px; color: var(--text-dim); flex: 1; }
.run-ref-btn { background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 10px; padding: 3px 7px; border-radius: 4px; transition: all 0.15s; flex-shrink: 0; }
.run-ref-btn:hover { background: var(--green-dim); color: var(--green); }

.ref-output { margin-top: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.ref-out-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--card2); border-bottom: 1px solid var(--border); font-size: 10px; }
.accent { color: var(--accent); }
.ref-pre { padding: 10px 12px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-dim); white-space: pre-wrap; max-height: 180px; overflow-y: auto; margin: 0; }

.tiny-btn { background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 10px; padding: 2px 5px; border-radius: 3px; transition: color 0.15s; }
.tiny-btn:hover { color: var(--text-dim); }
.ml-auto { margin-left: auto; }

.spinner { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: spin 0.7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
