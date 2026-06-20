import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, CheckCircle, XCircle, Loader2, Trash2,
  AlertTriangle, Info, ToggleLeft, ToggleRight, Bell,
  Globe, Wifi, WifiOff, Zap, Star,
} from 'lucide-react'
import { GlassCard } from '../components/UI/GlassCard'
import {
  getConfig, updateConfig, testConnection, clearMemories,
  setBackendUrl, getBackendUrl, checkBackendHealth,
} from '../lib/api'
import { requestNotificationPermission } from '../lib/notifications'
import type { Config } from '../types'
import toast from 'react-hot-toast'

// ─── Sub-components ───────────────────────────────────────────────────────────

type Provider = 'gemini' | 'anthropic' | 'openai' | 'xai'
type TestState = 'idle' | 'testing' | 'ok' | 'fail'

interface KeyInputProps {
  label: string
  provider: Provider
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onTest: () => void
  testStatus: TestState
  hasSavedKey?: boolean
  recommended?: boolean
  hint?: string
}

const KeyInput: React.FC<KeyInputProps> = ({
  label, value, onChange, placeholder, onTest,
  testStatus, hasSavedKey, recommended, hint,
}) => {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        {recommended && (
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold"
            style={{ background: 'rgba(232,112,64,0.15)', color: '#E87040', border: '1px solid rgba(232,112,64,0.3)' }}
          >
            <Star size={9} />
            RECOMMENDED
          </span>
        )}
        {hasSavedKey && !value && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: 'rgba(78,204,163,0.12)', color: '#4ECCA3', border: '1px solid rgba(78,204,163,0.2)' }}
          >
            ✓ Saved
          </span>
        )}
        {testStatus === 'ok' && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: 'rgba(78,204,163,0.12)', color: '#4ECCA3', border: '1px solid rgba(78,204,163,0.2)' }}
          >
            ✓ Connected
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
            className="flex-1 bg-transparent text-sm outline-none font-mono placeholder-muted"
            style={{ color: '#EEEEF0' }}
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
          disabled={testStatus === 'testing' || (!value.trim() && !hasSavedKey)}
          className="px-3 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40 min-w-[56px] flex items-center justify-center"
          style={{
            background:
              testStatus === 'ok' ? 'rgba(78,204,163,0.12)' :
              testStatus === 'fail' ? 'rgba(239,83,80,0.1)' :
              'rgba(42,45,74,0.5)',
            border:
              testStatus === 'ok' ? '1px solid rgba(78,204,163,0.25)' :
              testStatus === 'fail' ? '1px solid rgba(239,83,80,0.25)' :
              '1px solid rgba(42,45,74,0.7)',
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

      {hint && (
        <p className="text-[11px] text-text-muted leading-relaxed">{hint}</p>
      )}
    </div>
  )
}

const ToggleRow: React.FC<{
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className="flex-shrink-0"
      aria-label={`${value ? 'Disable' : 'Enable'} ${label}`}
      aria-pressed={value}
      role="switch"
      aria-checked={value}
    >
      {value
        ? <ToggleRight size={28} style={{ color: '#E87040' }} aria-hidden="true" />
        : <ToggleLeft size={28} className="text-text-muted" aria-hidden="true" />
      }
    </button>
  </div>
)

const Section: React.FC<{ title: string; children: React.ReactNode; delay?: number; accent?: string }> = ({
  title, children, delay = 0, accent,
}) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">{title}</h2>
    <GlassCard glow={accent}>
      <div className="space-y-4">{children}</div>
    </GlassCard>
  </motion.div>
)

// ─── Model options ────────────────────────────────────────────────────────────

const MODEL_OPTIONS = [
  // Gemini — Primary / Recommended
  { value: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro (best quality)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (fast + capable)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  // Claude (Anthropic)
  { value: 'claude-opus-4-7',           label: 'Claude Opus 4.7' },
  { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  // GPT (OpenAI)
  { value: 'gpt-5.5',     label: 'GPT-5.5' },
  { value: 'gpt-4.1',     label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  // Grok (xAI)
  { value: 'grok-3',      label: 'Grok 3' },
  { value: 'grok-3-mini', label: 'Grok 3 mini' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  const [geminiKey, setGeminiKey]     = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey]     = useState('')
  const [xaiKey, setXaiKey]           = useState('')

  const [defaultModel, setDefaultModel] = useState('gemini-2.5-flash')
  const [temperature, setTemperature]   = useState(0.7)
  const [maxTokens, setMaxTokens]       = useState(4096)
  const [memoryEnabled, setMemoryEnabled]   = useState(true)
  const [codeExecEnabled, setCodeExecEnabled] = useState(true)
  const [maxConcurrentAgents, setMaxConcurrentAgents] = useState(3)
  const [saving, setSaving]             = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [activeProvider, setActiveProvider] = useState('')

  const [savedKeys, setSavedKeys] = useState({
    gemini: false, anthropic: false, openai: false, xai: false,
  })

  const [backendUrl, setBackendUrlState] = useState(getBackendUrl())
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const [checkingBackend, setCheckingBackend] = useState(false)

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const [testStatus, setTestStatus] = useState<Record<Provider, TestState>>({
    gemini: 'idle', anthropic: 'idle', openai: 'idle', xai: 'idle',
  })

  useEffect(() => {
    checkBackendHealth().then(ok => setBackendStatus(ok ? 'online' : 'offline'))
  }, [])

  useEffect(() => {
    getConfig()
      .then((cfg: Config & { active_provider?: string }) => {
        if (cfg.default_model) setDefaultModel(cfg.default_model)
        if (cfg.temperature   !== undefined) setTemperature(cfg.temperature)
        if (cfg.max_tokens    !== undefined) setMaxTokens(cfg.max_tokens)
        if (cfg.memory_enabled !== undefined) setMemoryEnabled(cfg.memory_enabled)
        if (cfg.code_execution_enabled !== undefined) setCodeExecEnabled(cfg.code_execution_enabled)
        if (cfg.max_concurrent_agents  !== undefined) setMaxConcurrentAgents(cfg.max_concurrent_agents)
        if ((cfg as any).active_provider) setActiveProvider((cfg as any).active_provider)
        setSavedKeys({
          gemini:    !!cfg.gemini_api_key,
          anthropic: !!cfg.anthropic_api_key,
          openai:    !!cfg.openai_api_key,
          xai:       !!cfg.xai_api_key,
        })
      })
      .catch(() => {})
  }, [])

  const handleCheckBackend = async () => {
    setCheckingBackend(true)
    setBackendUrl(backendUrl)
    const ok = await checkBackendHealth()
    setBackendStatus(ok ? 'online' : 'offline')
    setCheckingBackend(false)
    if (ok) toast.success('Backend is reachable!')
    else toast.error('Cannot reach backend — check the URL and that Docker is running')
  }

  const handleSave = async () => {
    setSaving(true)
    setBackendUrl(backendUrl)
    try {
      await updateConfig({
        anthropic_api_key:  anthropicKey  || undefined,
        openai_api_key:     openaiKey     || undefined,
        gemini_api_key:     geminiKey     || undefined,
        xai_api_key:        xaiKey        || undefined,
        default_model:      defaultModel,
        temperature,
        max_tokens:         maxTokens,
        memory_enabled:     memoryEnabled,
        code_execution_enabled: codeExecEnabled,
        max_concurrent_agents:  maxConcurrentAgents,
      })
      // Refresh saved-key indicators
      setSavedKeys(prev => ({
        ...prev,
        gemini:    geminiKey    ? true : prev.gemini,
        anthropic: anthropicKey ? true : prev.anthropic,
        openai:    openaiKey    ? true : prev.openai,
        xai:       xaiKey       ? true : prev.xai,
      }))
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (provider: Provider) => {
    const keyMap: Record<Provider, string> = {
      gemini: geminiKey, anthropic: anthropicKey, openai: openaiKey, xai: xaiKey,
    }
    setTestStatus(s => ({ ...s, [provider]: 'testing' }))
    try {
      const result = await testConnection(provider, keyMap[provider] || undefined)
      setTestStatus(s => ({ ...s, [provider]: result.success ? 'ok' : 'fail' }))
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    } catch (err: any) {
      setTestStatus(s => ({ ...s, [provider]: 'fail' }))
      const msg = err?.response?.data?.message || err?.message || 'Cannot reach backend'
      toast.error(msg.length > 120 ? msg.slice(0, 120) + '…' : msg)
    }
    setTimeout(() => setTestStatus(s => ({ ...s, [provider]: 'idle' })), 6000)
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

  const statusDot = (
    <span
      className="w-2 h-2 rounded-full inline-block"
      style={{
        background:
          backendStatus === 'online' ? '#4ECCA3' :
          backendStatus === 'offline' ? '#EF5350' : '#9096B8',
      }}
    />
  )

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto space-y-5">

      {/* ── Backend Connection ──────────────────────────────────────── */}
      <Section title="Backend Connection" delay={0}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {backendStatus === 'online'
              ? <Wifi size={14} style={{ color: '#4ECCA3' }} />
              : backendStatus === 'offline'
              ? <WifiOff size={14} style={{ color: '#EF5350' }} />
              : <Globe size={14} className="text-text-muted" />}
            <span className="text-sm font-medium text-text-primary">Status</span>
          </div>
          <div className="flex items-center gap-2">
            {statusDot}
            <span
              className="text-xs font-medium"
              style={{
                color:
                  backendStatus === 'online' ? '#4ECCA3' :
                  backendStatus === 'offline' ? '#EF5350' : '#9096B8',
              }}
            >
              {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Unknown'}
              {activeProvider && backendStatus === 'online' && ` · ${activeProvider}`}
            </span>
          </div>
        </div>

        <div className="h-px" style={{ background: 'rgba(42,45,74,0.5)' }} />

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
              placeholder="http://localhost:8000"
              className="flex-1 bg-transparent text-sm outline-none font-mono placeholder-muted"
            style={{ color: '#EEEEF0' }}
            />
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Run the Docker stack locally:{' '}
            <code className="font-mono" style={{ color: '#4FC3F7' }}>docker-compose up --build</code>
            . Leave blank if frontend and backend share the same server.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCheckBackend}
          disabled={checkingBackend}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: 'rgba(42,45,74,0.5)', border: '1px solid rgba(42,45,74,0.7)', color: '#9096B8' }}
        >
          {checkingBackend ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
          Check Connection
        </motion.button>
      </Section>

      {/* ── Notifications ───────────────────────────────────────────── */}
      <Section title="Notifications" delay={0.03}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Browser Notifications</p>
            <p className="text-xs text-text-muted mt-0.5">
              {notifPermission === 'granted'
                ? 'Enabled — you will be alerted when tasks complete.'
                : notifPermission === 'denied'
                ? 'Blocked in browser settings. Re-enable via site permissions.'
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
              style={{ background: 'rgba(232,112,64,0.12)', border: '1px solid rgba(232,112,64,0.3)', color: '#E87040' }}
            >
              <Bell size={13} />
              Enable
            </motion.button>
          )}
          {notifPermission === 'granted' && <CheckCircle size={18} style={{ color: '#4ECCA3', flexShrink: 0 }} />}
          {notifPermission === 'denied'  && <XCircle size={18} style={{ color: '#EF5350', flexShrink: 0 }} />}
        </div>
      </Section>

      {/* ── API Keys ────────────────────────────────────────────────── */}
      <Section title="API Keys" delay={0.05} accent="#E87040">
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(232,112,64,0.06)', border: '1px solid rgba(232,112,64,0.18)' }}
        >
          <Zap size={14} style={{ color: '#E87040' }} className="mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Keys are stored in{' '}
            <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: 'rgba(79,195,247,0.1)', color: '#4FC3F7' }}>
              config.yaml
            </code>
            {' '}on your server. You can test a key before saving it.
          </p>
        </div>

        {/* Gemini — First & Recommended */}
        <KeyInput
          label="Google Gemini"
          provider="gemini"
          value={geminiKey}
          onChange={setGeminiKey}
          placeholder="AIza..."
          onTest={() => handleTest('gemini')}
          testStatus={testStatus.gemini}
          hasSavedKey={savedKeys.gemini}
          recommended
          hint="Free tier available at aistudio.google.com/apikey — no credit card required."
        />

        <div className="h-px" style={{ background: 'rgba(42,45,74,0.4)' }} />

        <KeyInput
          label="Anthropic (Claude)"
          provider="anthropic"
          value={anthropicKey}
          onChange={setAnthropicKey}
          placeholder="sk-ant-..."
          onTest={() => handleTest('anthropic')}
          testStatus={testStatus.anthropic}
          hasSavedKey={savedKeys.anthropic}
        />

        <KeyInput
          label="OpenAI (GPT)"
          provider="openai"
          value={openaiKey}
          onChange={setOpenaiKey}
          placeholder="sk-..."
          onTest={() => handleTest('openai')}
          testStatus={testStatus.openai}
          hasSavedKey={savedKeys.openai}
        />

        <KeyInput
          label="xAI (Grok)"
          provider="xai"
          value={xaiKey}
          onChange={setXaiKey}
          placeholder="xai-..."
          onTest={() => handleTest('xai')}
          testStatus={testStatus.xai}
          hasSavedKey={savedKeys.xai}
        />
      </Section>

      {/* ── Model Settings ──────────────────────────────────────────── */}
      <Section title="Model Settings" delay={0.1}>
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Default Model</label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none appearance-none"
            style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid rgba(42,45,74,0.7)' }}
          >
            {MODEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} style={{ background: '#12121F' }}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-text-secondary">Temperature</label>
            <span className="text-xs font-mono" style={{ color: '#E87040' }}>{temperature.toFixed(1)}</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full" style={{ accentColor: '#E87040' }}
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>Precise</span><span>Creative</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Max Output Tokens</label>
          <input
            type="number" min="256" max="65536" step="256"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none font-mono"
            style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid rgba(42,45,74,0.7)' }}
          />
        </div>
      </Section>

      {/* ── System Settings ─────────────────────────────────────────── */}
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
          description="Allow agents to run Python scripts"
          value={codeExecEnabled}
          onChange={setCodeExecEnabled}
        />
        <div className="h-px" style={{ background: 'rgba(42,45,74,0.5)' }} />
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-text-primary">Max Concurrent Agents</p>
              <p className="text-xs text-text-muted mt-0.5">How many agents run simultaneously</p>
            </div>
            <span className="text-sm font-mono font-bold" style={{ color: '#4FC3F7' }}>
              {maxConcurrentAgents}
            </span>
          </div>
          <input
            type="range" min="1" max="10" step="1"
            value={maxConcurrentAgents}
            onChange={(e) => setMaxConcurrentAgents(parseInt(e.target.value))}
            className="w-full" style={{ accentColor: '#4FC3F7' }}
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>1</span><span>5</span><span>10</span>
          </div>
        </div>
      </Section>

      {/* ── Data Management ─────────────────────────────────────────── */}
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
                <AlertTriangle size={14} style={{ color: '#F5C518' }} className="flex-shrink-0" />
                <p className="text-xs text-text-secondary">
                  This will permanently delete all stored memories. Cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearMemories}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(239,83,80,0.15)', border: '1px solid rgba(239,83,80,0.3)', color: '#EF5350' }}
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
              style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)', color: '#EF5350' }}
            >
              <Trash2 size={15} />
              Clear All Memories
            </motion.button>
          )}
        </AnimatePresence>
      </Section>

      {/* ── About ───────────────────────────────────────────────────── */}
      <Section title="About" delay={0.25}>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Version',        value: '2.0.0' },
            { label: 'Framework',      value: 'NEXUS AI' },
            { label: 'Agents',         value: '5 specialized (Gemini-first)' },
            { label: 'Primary LLM',    value: 'Google Gemini 2.5' },
            { label: 'Built with',     value: 'React + FastAPI' },
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
            ? 'rgba(232,112,64,0.5)'
            : 'linear-gradient(135deg, #E87040, #C4663E 50%, #7C71F0)',
          boxShadow: '0 4px 24px rgba(232,112,64,0.25)',
        }}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Saving…
          </span>
        ) : (
          'Save Settings'
        )}
      </motion.button>
    </div>
  )
}
