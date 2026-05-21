import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle, Info, ToggleLeft, ToggleRight, Bell, Globe, Wifi, WifiOff } from 'lucide-react'
import { GlassCard } from '../components/UI/GlassCard'
import { getConfig, updateConfig, testConnection, clearMemories, setBackendUrl, getBackendUrl, checkBackendHealth } from '../lib/api'
import { requestNotificationPermission } from '../lib/notifications'
import type { Config } from '../types'
import toast from 'react-hot-toast'

// ------- Sub-components -------

interface KeyInputProps {
  label: string
  provider: 'anthropic' | 'openai' | 'gemini'
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onTest: () => void
  testStatus: 'idle' | 'testing' | 'ok' | 'fail'
  hasSavedKey?: boolean
}

const KeyInput: React.FC<KeyInputProps> = ({ label, value, onChange, placeholder, onTest, testStatus, hasSavedKey }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        {hasSavedKey && !value && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: 'rgba(78,204,163,0.12)', color: '#4ECCA3', border: '1px solid rgba(78,204,163,0.2)' }}
          >
            ✓ Saved
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid rgba(42,45,74,0.7)' }}
        >
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? 'Enter API key...'}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none font-mono"
          />
          <button
            onClick={() => setShow(!show)}
            className="text-text-muted transition-colors p-0.5"
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onTest}
          disabled={testStatus === 'testing' || !value.trim()}
          className="px-3 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40 min-w-[56px] flex items-center justify-center"
          style={{
            background: 'rgba(42,45,74,0.5)',
            border: '1px solid rgba(42,45,74,0.7)',
            color: '#9096B8',
          }}
        >
          {testStatus === 'testing' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : testStatus === 'ok' ? (
            <CheckCircle size={14} style={{ color: '#4ECCA3' }} />
          ) : testStatus === 'fail' ? (
            <XCircle size={14} style={{ color: '#EF5350' }} />
          ) : (
            'Test'
          )}
        </motion.button>
      </div>
    </div>
  )
}

interface ToggleRowProps {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className="flex-shrink-0 transition-colors"
      aria-label={`Toggle ${label}`}
    >
      {value ? (
        <ToggleRight size={28} style={{ color: '#D97757' }} />
      ) : (
        <ToggleLeft size={28} className="text-text-muted" />
      )}
    </button>
  </div>
)

interface SectionProps {
  title: string
  children: React.ReactNode
  delay?: number
}

const Section: React.FC<SectionProps> = ({ title, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">{title}</p>
    <GlassCard>
      <div className="space-y-4">{children}</div>
    </GlassCard>
  </motion.div>
)

// ------- Main Component -------

const MODEL_OPTIONS = [
  // Claude (Anthropic) — Latest 2026
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  // GPT (OpenAI) — Latest 2026
  'gpt-5.5',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4o',
  // Gemini (Google) — Latest 2026
  'gemini-3.1-pro',
  'gemini-3-flash',
  'gemini-2.5-flash',
  // Grok (xAI)
  'grok-3',
  'grok-3-mini',
]

export const Settings: React.FC = () => {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [xaiKey, setXaiKey] = useState('')
  const [defaultModel, setDefaultModel] = useState('claude-sonnet-4-6')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [codeExecEnabled, setCodeExecEnabled] = useState(true)
  const [maxConcurrentAgents, setMaxConcurrentAgents] = useState(3)
  const [saving, setSaving] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Saved key status indicators
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({
    anthropic: false,
    openai: false,
    gemini: false,
    xai: false,
  })

  // Backend URL
  const [backendUrl, setBackendUrlState] = useState(getBackendUrl())
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const [checkingBackend, setCheckingBackend] = useState(false)

  // Notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({
    anthropic: 'idle',
    openai: 'idle',
    gemini: 'idle',
    xai: 'idle',
  })

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then(ok => setBackendStatus(ok ? 'online' : 'offline'))
  }, [])

  useEffect(() => {
    getConfig()
      .then((cfg: Config) => {
        if (cfg.default_model) setDefaultModel(cfg.default_model)
        if (cfg.temperature !== undefined) setTemperature(cfg.temperature)
        if (cfg.max_tokens !== undefined) setMaxTokens(cfg.max_tokens)
        if (cfg.memory_enabled !== undefined) setMemoryEnabled(cfg.memory_enabled)
        if (cfg.code_execution_enabled !== undefined) setCodeExecEnabled(cfg.code_execution_enabled)
        if (cfg.max_concurrent_agents !== undefined) setMaxConcurrentAgents(cfg.max_concurrent_agents)
        // Mark which keys are already saved on the backend (non-empty masked values)
        setSavedKeys({
          anthropic: !!cfg.anthropic_api_key,
          openai: !!cfg.openai_api_key,
          gemini: !!cfg.gemini_api_key,
          xai: !!cfg.xai_api_key,
        })
      })
      .catch(() => {})
  }, [])

  const handleCheckBackend = async () => {
    setCheckingBackend(true)
    const ok = await checkBackendHealth()
    setBackendStatus(ok ? 'online' : 'offline')
    setCheckingBackend(false)
    if (ok) toast.success('Backend is reachable!')
    else toast.error('Cannot reach backend — check the URL and that Docker is running')
  }

  const handleSave = async () => {
    setSaving(true)
    // Save backend URL to localStorage
    setBackendUrl(backendUrl)
    try {
      await updateConfig({
        anthropic_api_key: anthropicKey || undefined,
        openai_api_key: openaiKey || undefined,
        gemini_api_key: geminiKey || undefined,
        xai_api_key: xaiKey || undefined,
        default_model: defaultModel,
        temperature,
        max_tokens: maxTokens,
        memory_enabled: memoryEnabled,
        code_execution_enabled: codeExecEnabled,
        max_concurrent_agents: maxConcurrentAgents,
      })
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (provider: 'anthropic' | 'openai' | 'gemini' | 'xai') => {
    const keyMap: Record<string, string> = {
      anthropic: anthropicKey,
      openai: openaiKey,
      gemini: geminiKey,
      xai: xaiKey,
    }
    const currentKey = keyMap[provider]
    setTestStatus((s) => ({ ...s, [provider]: 'testing' }))
    try {
      const result = await testConnection(provider as any, currentKey || undefined)
      const ok = result.success
      setTestStatus((s) => ({ ...s, [provider]: ok ? 'ok' : 'fail' }))
      if (ok) toast.success(result.message || `${provider} connected!`)
      else toast.error(result.message || 'Connection failed')
    } catch {
      setTestStatus((s) => ({ ...s, [provider]: 'fail' }))
      toast.error('Cannot reach backend — enter the Backend URL and start Docker')
    }
    setTimeout(() => setTestStatus((s) => ({ ...s, [provider]: 'idle' })), 5000)
  }

  const handleClearMemories = async () => {
    try {
      await clearMemories()
      setShowClearConfirm(false)
      toast.success('All memories cleared')
    } catch {
      toast.error('Failed to clear memories')
    }
  }

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    setNotifPermission('Notification' in window ? Notification.permission : 'unsupported')
    if (granted) toast.success('Notifications enabled!')
    else toast.error('Notification permission denied')
  }

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto space-y-5">

      {/* Backend Connection — FIRST */}
      <Section title="Backend Connection" delay={0}>
        {/* Status indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {backendStatus === 'online' ? (
              <Wifi size={14} style={{ color: '#4ECCA3' }} />
            ) : backendStatus === 'offline' ? (
              <WifiOff size={14} style={{ color: '#EF5350' }} />
            ) : (
              <Globe size={14} className="text-text-muted" />
            )}
            <span className="text-sm font-medium text-text-primary">Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  backendStatus === 'online' ? '#4ECCA3' :
                  backendStatus === 'offline' ? '#EF5350' :
                  '#9096B8',
              }}
            />
            <span
              className="text-xs font-medium"
              style={{
                color:
                  backendStatus === 'online' ? '#4ECCA3' :
                  backendStatus === 'offline' ? '#EF5350' :
                  '#9096B8',
              }}
            >
              {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Unknown'}
            </span>
          </div>
        </div>

        <div className="h-px" style={{ background: 'rgba(42,45,74,0.5)' }} />

        {/* URL input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Backend URL</label>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid rgba(42,45,74,0.7)' }}
          >
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrlState(e.target.value)}
              placeholder="http://localhost:8000 or https://your-server.com"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none font-mono"
            />
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Run the Docker stack locally and enter its URL here. Leave blank if running on the same server.
          </p>
        </div>

        {/* Check Connection button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCheckBackend}
          disabled={checkingBackend}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: 'rgba(42,45,74,0.5)',
            border: '1px solid rgba(42,45,74,0.7)',
            color: '#9096B8',
          }}
        >
          {checkingBackend ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Wifi size={14} />
          )}
          Check Connection
        </motion.button>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" delay={0.03}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Browser Notifications</p>
            <p className="text-xs text-text-muted mt-0.5">
              {notifPermission === 'granted'
                ? 'Notifications are enabled — you will be alerted when tasks complete.'
                : notifPermission === 'denied'
                ? 'Notifications blocked in browser settings.'
                : notifPermission === 'unsupported'
                ? 'Your browser does not support notifications.'
                : 'Get notified when tasks complete or fail.'}
            </p>
          </div>
          {notifPermission !== 'granted' && notifPermission !== 'unsupported' && notifPermission !== 'denied' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleEnableNotifications}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0"
              style={{
                background: 'rgba(217,119,87,0.12)',
                border: '1px solid rgba(217,119,87,0.3)',
                color: '#D97757',
              }}
            >
              <Bell size={13} />
              Enable
            </motion.button>
          )}
          {notifPermission === 'granted' && (
            <CheckCircle size={18} style={{ color: '#4ECCA3', flexShrink: 0 }} />
          )}
          {notifPermission === 'denied' && (
            <XCircle size={18} style={{ color: '#EF5350', flexShrink: 0 }} />
          )}
        </div>
      </Section>

      {/* API Keys */}
      <Section title="API Keys" delay={0.05}>
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(79,195,247,0.06)', border: '1px solid rgba(79,195,247,0.15)' }}
        >
          <Info size={14} style={{ color: '#4FC3F7' }} className="mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Keys are stored securely in{' '}
            <code className="font-mono text-accent px-1 py-0.5 rounded" style={{ background: 'rgba(79,195,247,0.1)' }}>
              config.yaml
            </code>
            . At least one key is required to run agents.
          </p>
        </div>

        <KeyInput
          label="Anthropic (Claude)"
          provider="anthropic"
          value={anthropicKey}
          onChange={setAnthropicKey}
          placeholder="sk-ant-..."
          onTest={() => handleTest('anthropic')}
          testStatus={testStatus.anthropic as 'idle' | 'testing' | 'ok' | 'fail'}
          hasSavedKey={savedKeys.anthropic}
        />
        <KeyInput
          label="OpenAI (GPT)"
          provider="openai"
          value={openaiKey}
          onChange={setOpenaiKey}
          placeholder="sk-..."
          onTest={() => handleTest('openai')}
          testStatus={testStatus.openai as 'idle' | 'testing' | 'ok' | 'fail'}
          hasSavedKey={savedKeys.openai}
        />
        <KeyInput
          label="Google Gemini"
          provider="gemini"
          value={geminiKey}
          onChange={setGeminiKey}
          placeholder="AIza..."
          onTest={() => handleTest('gemini')}
          testStatus={testStatus.gemini as 'idle' | 'testing' | 'ok' | 'fail'}
          hasSavedKey={savedKeys.gemini}
        />

        <KeyInput
          label="xAI (Grok-3)"
          provider="anthropic"
          value={xaiKey}
          onChange={setXaiKey}
          placeholder="xai-…"
          onTest={() => handleTest('xai')}
          testStatus={testStatus.xai as 'idle' | 'testing' | 'ok' | 'fail'}
          hasSavedKey={savedKeys.xai}
        />
      </Section>

      {/* Model Settings */}
      <Section title="Model Settings" delay={0.1}>
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Default Model</label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none appearance-none"
            style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid rgba(42,45,74,0.7)' }}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m} value={m} style={{ background: '#12121F' }}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-text-secondary">Temperature</label>
            <span className="text-xs font-mono" style={{ color: '#D97757' }}>
              {temperature.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-primary"
            style={{ accentColor: '#D97757' }}
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Max Tokens</label>
          <input
            type="number"
            min="256"
            max="32000"
            step="256"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none font-mono"
            style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid rgba(42,45,74,0.7)' }}
          />
        </div>
      </Section>

      {/* System Settings */}
      <Section title="System Settings" delay={0.15}>
        <ToggleRow
          label="Memory Enabled"
          description="Agents remember context across tasks"
          value={memoryEnabled}
          onChange={setMemoryEnabled}
        />

        <div className="h-px" style={{ background: 'rgba(42,45,74,0.5)' }} />

        <ToggleRow
          label="Code Execution"
          description="Allow agents to run Python code"
          value={codeExecEnabled}
          onChange={setCodeExecEnabled}
        />

        <div className="h-px" style={{ background: 'rgba(42,45,74,0.5)' }} />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-text-primary">Max Concurrent Agents</p>
              <p className="text-xs text-text-muted mt-0.5">How many agents can run simultaneously</p>
            </div>
            <span className="text-sm font-mono font-bold" style={{ color: '#4FC3F7' }}>
              {maxConcurrentAgents}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={maxConcurrentAgents}
            onChange={(e) => setMaxConcurrentAgents(parseInt(e.target.value))}
            className="w-full"
            style={{ accentColor: '#4FC3F7' }}
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management" delay={0.2}>
        <AnimatePresence mode="wait">
          {showClearConfirm ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-3"
            >
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(255,183,77,0.08)', border: '1px solid rgba(255,183,77,0.2)' }}
              >
                <AlertTriangle size={14} style={{ color: '#FFB74D' }} className="flex-shrink-0" />
                <p className="text-xs text-text-secondary">
                  This will permanently delete all stored memories. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearMemories}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: 'rgba(239,83,80,0.15)',
                    border: '1px solid rgba(239,83,80,0.3)',
                    color: '#EF5350',
                  }}
                >
                  Yes, Delete All
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-text-secondary"
                  style={{ background: 'rgba(42,45,74,0.5)', border: '1px solid rgba(42,45,74,0.7)' }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="clear-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium w-full"
              style={{
                background: 'rgba(239,83,80,0.08)',
                border: '1px solid rgba(239,83,80,0.2)',
                color: '#EF5350',
              }}
            >
              <Trash2 size={15} />
              Clear All Memories
            </motion.button>
          )}
        </AnimatePresence>
      </Section>

      {/* About */}
      <Section title="About" delay={0.25}>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Version', value: '1.0.0' },
            { label: 'Framework', value: 'NEXUS AI' },
            { label: 'Agents', value: '5 specialized' },
            { label: 'Built with', value: 'React + FastAPI' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-text-secondary">{label}</span>
              <span className="text-text-primary font-medium font-mono text-xs">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Save button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-2xl text-white font-semibold text-base transition-all disabled:opacity-60"
        style={{
          background: saving
            ? 'rgba(217,119,87,0.5)'
            : 'linear-gradient(135deg, #D97757, #C4663E 50%, #7C71F0)',
          boxShadow: '0 4px 24px rgba(217,119,87,0.25)',
        }}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Saving...
          </span>
        ) : (
          'Save Settings'
        )}
      </motion.button>
    </div>
  )
}
