import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle, Info } from 'lucide-react'
import { GlassCard } from '../components/UI/GlassCard'
import { getConfig, updateConfig, testConnection } from '../lib/api'
import toast from 'react-hot-toast'

interface KeyInputProps {
  label: string
  provider: string
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
        <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2.5">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || 'sk-...'}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none font-mono"
          />
          <button onClick={() => setShow(!show)} className="text-text-muted active:opacity-70 p-0.5">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={onTest}
          disabled={testStatus === 'testing' || !value}
          className="px-3 py-2.5 rounded-xl border text-xs font-medium transition-all active:scale-95 disabled:opacity-40
            border-border text-text-secondary hover:border-primary/50"
        >
          {testStatus === 'testing' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : testStatus === 'ok' ? (
            <CheckCircle size={14} className="text-success" />
          ) : testStatus === 'fail' ? (
            <XCircle size={14} className="text-error" />
          ) : (
            'Test'
          )}
        </button>
      </div>
    </div>
  )
}

export const Settings: React.FC = () => {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [defaultModel, setDefaultModel] = useState('claude-3-5-sonnet-20241022')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [saving, setSaving] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({
    anthropic: 'idle', openai: 'idle', gemini: 'idle',
  })

  useEffect(() => {
    getConfig().then(cfg => {
      if (cfg.models) {
        setDefaultModel(cfg.models.default || 'claude-3-5-sonnet-20241022')
        setTemperature(cfg.models.temperature ?? 0.7)
        setMaxTokens(cfg.models.max_tokens ?? 4096)
      }
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateConfig({
        anthropic_key: anthropicKey || undefined,
        openai_key: openaiKey || undefined,
        google_gemini_key: geminiKey || undefined,
        default_model: defaultModel,
        temperature,
        max_tokens: maxTokens,
      })
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (provider: string) => {
    setTestStatus(s => ({ ...s, [provider]: 'testing' }))
    try {
      const result = await testConnection(provider as any)
      const ok = (result as any).ok ?? (result as any).success
      setTestStatus(s => ({ ...s, [provider]: ok ? 'ok' : 'fail' }))
      if (ok) toast.success(`${provider} connected!`)
      else toast.error((result as any).error || (result as any).message || 'Connection failed')
    } catch {
      setTestStatus(s => ({ ...s, [provider]: 'fail' }))
      toast.error('Test failed')
    }
    setTimeout(() => setTestStatus(s => ({ ...s, [provider]: 'idle' })), 4000)
  }

  const MODEL_OPTIONS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-5-haiku-20241022',
    'gpt-4o',
    'gpt-4o-mini',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ]

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{title}</p>
      <GlassCard className="p-4 space-y-4">{children}</GlassCard>
    </motion.div>
  )

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto space-y-5">
      {/* API Keys */}
      <Section title="API Keys">
        <div className="flex items-start gap-2 p-3 bg-accent/8 rounded-xl border border-accent/20">
          <Info size={14} className="text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Keys are stored in <code className="font-mono text-accent">config.yaml</code> at the project root.
            You can also set them here for the current session.
          </p>
        </div>
        <KeyInput
          label="Anthropic (Claude)"
          provider="anthropic"
          value={anthropicKey}
          onChange={setAnthropicKey}
          placeholder="sk-ant-..."
          onTest={() => handleTest('anthropic')}
          testStatus={testStatus.anthropic}
        />
        <KeyInput
          label="OpenAI (GPT-4o)"
          provider="openai"
          value={openaiKey}
          onChange={setOpenaiKey}
          placeholder="sk-..."
          onTest={() => handleTest('openai')}
          testStatus={testStatus.openai}
        />
        <KeyInput
          label="Google Gemini"
          provider="gemini"
          value={geminiKey}
          onChange={setGeminiKey}
          placeholder="AIza..."
          onTest={() => handleTest('gemini')}
          testStatus={testStatus.gemini}
        />
      </Section>

      {/* Model Settings */}
      <Section title="Model Settings">
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Default Model</label>
          <select
            value={defaultModel}
            onChange={e => setDefaultModel(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none"
          >
            {MODEL_OPTIONS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-medium text-text-secondary">Temperature</label>
            <span className="text-xs text-primary font-mono">{temperature.toFixed(1)}</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.1"
            value={temperature}
            onChange={e => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>Precise</span><span>Creative</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Max Tokens</label>
          <input
            type="number" min="256" max="32000" step="256"
            value={maxTokens}
            onChange={e => setMaxTokens(parseInt(e.target.value))}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none font-mono"
          />
        </div>
      </Section>

      {/* Danger Zone */}
      <Section title="Data Management">
        {showClearConfirm ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-warning flex items-center gap-1">
              <AlertTriangle size={14} /> Are you sure? This cannot be undone.
            </span>
            <button
              onClick={() => { setShowClearConfirm(false); toast('Memory cleared (demo)') }}
              className="px-3 py-1.5 rounded-xl bg-error/20 text-error text-xs font-medium"
            >
              Yes, clear all
            </button>
            <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 rounded-xl bg-card text-text-secondary text-xs">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium active:scale-95"
          >
            <Trash2 size={15} /> Clear All Memories
          </button>
        )}
      </Section>

      {/* About */}
      <Section title="About">
        <div className="space-y-1 text-sm text-text-secondary">
          <div className="flex justify-between"><span>Version</span><span className="font-mono text-text-primary">1.0.0</span></div>
          <div className="flex justify-between"><span>Framework</span><span className="text-text-primary">NEXUS AI</span></div>
          <div className="flex justify-between"><span>Agents</span><span className="text-text-primary">5 specialized agents</span></div>
        </div>
      </Section>

      {/* Save button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold
                   text-base shadow-lg shadow-primary/25 active:opacity-90 disabled:opacity-60 transition-all"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </motion.button>
    </div>
  )
}
