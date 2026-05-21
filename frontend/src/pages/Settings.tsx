import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle, Info, ToggleLeft, ToggleRight } from 'lucide-react'
import { GlassCard } from '../components/UI/GlassCard'
import { getConfig, updateConfig, testConnection, clearMemories } from '../lib/api'
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
}

const KeyInput: React.FC<KeyInputProps> = ({ label, value, onChange, placeholder, onTest, testStatus }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
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
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-5-haiku-20241022',
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

export const Settings: React.FC = () => {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [defaultModel, setDefaultModel] = useState('claude-3-5-sonnet-20241022')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [codeExecEnabled, setCodeExecEnabled] = useState(true)
  const [maxConcurrentAgents, setMaxConcurrentAgents] = useState(3)
  const [saving, setSaving] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({
    anthropic: 'idle',
    openai: 'idle',
    gemini: 'idle',
  })

  useEffect(() => {
    getConfig()
      .then((cfg: Config) => {
        if (cfg.default_model) setDefaultModel(cfg.default_model)
        if (cfg.temperature !== undefined) setTemperature(cfg.temperature)
        if (cfg.max_tokens !== undefined) setMaxTokens(cfg.max_tokens)
        if (cfg.memory_enabled !== undefined) setMemoryEnabled(cfg.memory_enabled)
        if (cfg.code_execution_enabled !== undefined) setCodeExecEnabled(cfg.code_execution_enabled)
        if (cfg.max_concurrent_agents !== undefined) setMaxConcurrentAgents(cfg.max_concurrent_agents)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateConfig({
        anthropic_api_key: anthropicKey || undefined,
        openai_api_key: openaiKey || undefined,
        gemini_api_key: geminiKey || undefined,
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

  const handleTest = async (provider: 'anthropic' | 'openai' | 'gemini') => {
    setTestStatus((s) => ({ ...s, [provider]: 'testing' }))
    try {
      const result = await testConnection(provider)
      const ok = result.success
      setTestStatus((s) => ({ ...s, [provider]: ok ? 'ok' : 'fail' }))
      if (ok) toast.success(`${provider} connected!`)
      else toast.error(result.message || 'Connection failed')
    } catch {
      setTestStatus((s) => ({ ...s, [provider]: 'fail' }))
      toast.error('Test failed')
    }
    setTimeout(() => setTestStatus((s) => ({ ...s, [provider]: 'idle' })), 4000)
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

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto space-y-5">
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
        />
        <KeyInput
          label="OpenAI (GPT-4o)"
          provider="openai"
          value={openaiKey}
          onChange={setOpenaiKey}
          placeholder="sk-..."
          onTest={() => handleTest('openai')}
          testStatus={testStatus.openai as 'idle' | 'testing' | 'ok' | 'fail'}
        />
        <KeyInput
          label="Google Gemini"
          provider="gemini"
          value={geminiKey}
          onChange={setGeminiKey}
          placeholder="AIza..."
          onTest={() => handleTest('gemini')}
          testStatus={testStatus.gemini as 'idle' | 'testing' | 'ok' | 'fail'}
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
