import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, CheckCircle, XCircle, Loader2, Trash2,
  AlertTriangle, ToggleLeft, ToggleRight, Bell,
  Wifi, WifiOff, Globe, Zap, Star,
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
        <label className="text-xs font-medium" style={{ color: '#8A8A9A' }}>{label}</label>
        {recommended && (
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold"
            style={{ background: 'rgba(232,112,64,0.12)', color: '#E87040', border: '1px solid rgba(232,112,64,0.25)' }}
          >
            <Star size={9} />
            RECOMMENDED
          </span>
        )}
        {hasSavedKey && !value && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: 'rgba(45,212,191,0.10)', color: '#2DD4BF', border: '1px solid rgba(45,212,191,0.20)' }}
          >
            ✓ Saved
          </span>
        )}
        {testStatus === 'ok' && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: 'rgba(45,212,191,0.10)', color: '#2DD4BF', border: '1px solid rgba(45,212,191,0.20)' }}
          >
            ✓ Connected
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(16,16,22,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? 'Enter API key…'}
            className="flex-1 bg-transparent text-sm outline-none font-mono placeholder-muted"
            style={{ color: '#F0F0F4' }}
          />
          <button
            onClick={() => setShow(!show)}
            className="p-0.5 transition-opacity hover:opacity-80"
            aria-label={show ? 'Hide key' : 'Show key'}
            style={{ color: '#55556A' }}
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
              testStatus === 'ok'   ? 'rgba(45,212,191,0.10)' :
              testStatus === 'fail' ? 'rgba(239,96,96,0.08)'  :
              'rgba(29,29,38,0.7)',
            border:
              testStatus === 'ok'   ? '1px solid rgba(45,212,191,0.22)' :
              testStatus === 'fail' ? '1px solid rgba(239,96,96,0.22)' :
              '1px solid rgba(255,255,255,0.06)',
            color: '#8A8A9A',
          }}
        >
          {testStatus === 'testing' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : testStatus === 'ok' ? (
            <CheckCircle size={14} style={{ color: '#2DD4BF' }} />
          ) : testStatus === 'fail' ? (
            <XCircle size={14} style={{ color: '#EF6060' }} />
          ) : (
            'Test'
          )}
        </motion.button>
      </div>

      {hint && (
        <p className="text-[11px] leading-relaxed" style={{ color: '#55556A' }}>{hint}</p>
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
      <p className="text-sm font-medium" style={{ color: '#F0F0F4' }}>{label}</p>
      {description && <p className="text-xs mt-0.5" style={{ color: '#55556A' }}>{description}</p>}
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
        : <ToggleLeft size={28} style={{ color: '#55556A' }} aria-hidden="true" />
      }
    </button>
  </div>
)

const Section: React.FC<{ title: string; children: React.ReactNode; delay?: number; accent?: string }> = ({
  title, children, delay = 0, accent,
}) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <h2
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: '#55556A' }}
    >
      {title}
    </h2>
    <GlassCard glow={accent}>
      <div className="space-y-4">{children}</div>
    </GlassCard>
  </motion.div>
)

// ─── Model options ────────────────────────────────────────────────────────────

const MODEL_OPTIONS = [
  { value: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro (best quality)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (fast + capable)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'claude-opus-4-7',           label: 'Claude Opus 4.7' },
  { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'gpt-5.5',     label: 'GPT-5.5' },
  { value: 'gpt-4.1',     label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
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

  const statusColor =
    backendStatus === 'online'  ? '#2DD4BF' :
    backendStatus === 'offline' ? '#EF6060' : '#F5C518'

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto space-y-5">

      {/* ── Backend Connection ───────────────────────────────────────── */}
      <Section title="Backend Connection" delay={0}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {backendStatus === 'online'
              ? <Wifi size={14} style={{ color: '#2DD4BF' }} />
              : backendStatus === 'offline'
              ? <WifiOff size={14} style={{ color: '#EF6060' }} />
              : <Globe size={14} style={{ color: '#55556A' }} />}
            <span className="text-sm font-medium" style={{ color: '#F0F0F4' }}>Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: statusColor }}
            />
            <span className="text-xs font-medium" style={{ color: statusColor }}>
              {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Unknown'}
              {activeProvider && backendStatus === 'online' && ` · ${activeProvider}`}
            </span>
          </div>
        </div>

        <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />

        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: '#8A8A9A' }}>Backend URL</label>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(16,16,22,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrlState(e.target.value)}
              placeholder="http://localhost:8000"
              className="flex-1 bg-transparent text-sm outline-none font-mono placeholder-muted"
              style={{ color: '#F0F0F4' }}
            />
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#55556A' }}>
            Run the Docker stack locally:{' '}
            <code
              className="font-mono px-1 py-0.5 rounded text-xs"
              style={{ background: 'rgba(56,189,248,0.08)', color: '#38BDF8' }}
            >
              docker-compose up --build
            </code>
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCheckBackend}
          disabled={checkingBackend}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: 'rgba(29,29,38,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#8A8A9A',
          }}
        >
          {checkingBackend ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
          Check Connection
        </motion.button>
      </Section>

      {/* ── Notifications ───────────────────────────────────────────── */}
      <Section title="Notifications" delay={0.03}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#F0F0F4' }}>Browser Notifications</p>
            <p className="text-xs mt-0.5" style={{ color: '#55556A' }}>
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
              style={{
                background: 'rgba(232,112,64,0.10)',
                border: '1px solid rgba(232,112,64,0.25)',
                color: '#E87040',
              }}
            >
              <Bell size={13} />
              Enable
            </motion.button>
          )}
          {notifPermission === 'granted' && <CheckCircle size={18} style={{ color: '#2DD4BF', flexShrink: 0 }} />}
          {notifPermission === 'denied'  && <XCircle size={18} style={{ color: '#EF6060', flexShrink: 0 }} />}
        </div>
      </Section>

      {/* ── API Keys ────────────────────────────────────────────────── */}
      <Section title="API Keys" delay={0.05} accent="#E87040">
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(232,112,64,0.05)', border: '1px solid rgba(232,112,64,0.15)' }}
        >
          <Zap size={14} style={{ color: '#E87040' }} className="mt-0.5 flex-shrink-0" />
          <p className="text-xs leading-relaxed" style={{ color: '#8A8A9A' }}>
            Keys are stored in{' '}
            <code
              className="font-mono text-xs px-1 py-0.5 rounded"
              style={{ background: 'rgba(56,189,248,0.08)', color: '#38BDF8' }}
            >
              config.yaml
            </code>
            {' '}on your server. Test before saving.
          </p>
        </div>

        <KeyInput
          label="Google Gemini"
          provider="gemini"
          value={geminiKey}
          onChange={setGeminiKey}
          placeholder="AIza…"
          onTest={() => handleTest('gemini')}
          testStatus={testStatus.gemini}
          hasSavedKey={savedKeys.gemini}
          recommended
          hint="Free tier at aistudio.google.com/apikey — no credit card required."
        />

        <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />

        <KeyInput
          label="Anthropic (Claude)"
          provider="anthropic"
          value={anthropicKey}
          onChange={setAnthropicKey}
          placeholder="sk-ant-…"
          onTest={() => handleTest('anthropic')}
          testStatus={testStatus.anthropic}
          hasSavedKey={savedKeys.anthropic}
        />

        <KeyInput
          label="OpenAI (GPT)"
          provider="openai"
          value={openaiKey}
          onChange={setOpenaiKey}
          placeholder="sk-…"
          onTest={() => handleTest('openai')}
          testStatus={testStatus.openai}
          hasSavedKey={savedKeys.openai}
        />

        <KeyInput
          label="xAI (Grok)"
          provider="xai"
          value={xaiKey}
          onChange={setXaiKey}
          placeholder="xai-…"
          onTest={() => handleTest('xai')}
          testStatus={testStatus.xai}
          hasSavedKey={savedKeys.xai}
        />
      </Section>

      {/* ── Model Settings ──────────────────────────────────────────── */}
      <Section title="Model Settings" delay={0.1}>
        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: '#8A8A9A' }}>Default Model</label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none appearance-none"
            style={{
              background: 'rgba(16,16,22,0.85)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#F0F0F4',
            }}
          >
            {MODEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} style={{ background: '#16161E' }}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium" style={{ color: '#8A8A9A' }}>Temperature</label>
            <span className="text-xs font-mono" style={{ color: '#E87040' }}>{temperature.toFixed(1)}</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: '#E87040' }}
          />
          <div className="flex justify-between text-xs" style={{ color: '#55556A' }}>
            <span>Precise</span><span>Creative</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: '#8A8A9A' }}>Max Output Tokens</label>
          <input
            type="number" min="256" max="65536" step="256"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none font-mono"
            style={{
              background: 'rgba(16,16,22,0.85)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#F0F0F4',
            }}
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
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <ToggleRow
          label="Code Execution"
          description="Allow agents to run Python scripts"
          value={codeExecEnabled}
          onChange={setCodeExecEnabled}
        />
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium" style={{ color: '#F0F0F4' }}>Max Concurrent Agents</p>
              <p className="text-xs mt-0.5" style={{ color: '#55556A' }}>How many agents run simultaneously</p>
            </div>
            <span className="text-sm font-mono font-bold" style={{ color: '#38BDF8' }}>
              {maxConcurrentAgents}
            </span>
          </div>
          <input
            type="range" min="1" max="10" step="1"
            value={maxConcurrentAgents}
            onChange={(e) => setMaxConcurrentAgents(parseInt(e.target.value))}
            className="w-full"
            style={{ accentColor: '#38BDF8' }}
          />
          <div className="flex justify-between text-xs" style={{ color: '#55556A' }}>
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
                style={{ background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.18)' }}
              >
                <AlertTriangle size={14} style={{ color: '#F5C518' }} className="flex-shrink-0" />
                <p className="text-xs" style={{ color: '#8A8A9A' }}>
                  This will permanently delete all stored memories. Cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearMemories}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: 'rgba(239,96,96,0.12)',
                    border: '1px solid rgba(239,96,96,0.25)',
                    color: '#EF6060',
                  }}
                >
                  Yes, Delete All
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: 'rgba(29,29,38,0.7)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#8A8A9A',
                  }}
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
                background: 'rgba(239,96,96,0.06)',
                border: '1px solid rgba(239,96,96,0.18)',
                color: '#EF6060',
              }}
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
            { label: 'Version',     value: '3.0.0'                         },
            { label: 'Framework',   value: 'NEXUS AI'                      },
            { label: 'Agents',      value: '5 specialized'                 },
            { label: 'Primary LLM', value: 'Google Gemini 2.5'            },
            { label: 'Built with',  value: 'React + FastAPI'               },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span style={{ color: '#8A8A9A' }}>{label}</span>
              <span className="font-medium font-mono text-xs" style={{ color: '#F0F0F4' }}>{value}</span>
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
            : 'linear-gradient(135deg, #E87040 0%, #C45A28 50%, #9B8CE8 100%)',
          boxShadow: saving ? 'none' : '0 4px 24px rgba(232,112,64,0.28)',
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
