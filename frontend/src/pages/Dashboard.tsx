import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Database, Users, TrendingUp, Command, ArrowRight, Send } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AgentOrb } from '../components/UI/AgentOrb'
import { NexusGreeting } from '../components/UI/NexusGreeting'
import { TaskCard } from '../components/Tasks/TaskCard'
import { createTask, getTasks, getAgents, deleteTask, getStats } from '../lib/api'
import { useAppStore } from '../store/useAppStore'

const CAPABILITIES = [
  { label: 'Research',  prompt: 'Research in depth: ',         icon: '🔭' },
  { label: 'Code',      prompt: 'Write and explain code for: ', icon: '⚙' },
  { label: 'Write',     prompt: 'Write a professional piece on: ', icon: '✦' },
  { label: 'Analyze',   prompt: 'Analyze and summarize: ',      icon: '📊' },
  { label: 'Plan',      prompt: 'Create a strategic plan for: ', icon: '⚡' },
  { label: 'Debug',     prompt: 'Debug and fix: ',               icon: '🐛' },
  { label: 'Summarize', prompt: 'Summarize the key points of: ', icon: '◎' },
  { label: 'Extract',   prompt: 'Extract insights from: ',       icon: '◆' },
]

const AGENT_INFO = [
  { type: 'STRATEGIST', name: 'NEXUS',  desc: 'Orchestrator' },
  { type: 'RESEARCHER', name: 'ARIA',   desc: 'Research'     },
  { type: 'CODER',      name: 'FORGE',  desc: 'Code'         },
  { type: 'WRITER',     name: 'SCRIBE', desc: 'Writer'       },
  { type: 'MEMORY',     name: 'ECHO',   desc: 'Memory'       },
]

const StatCard: React.FC<{
  icon: React.ElementType; label: string; value: string | number; color: string; delay?: number
}> = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    className="rounded-2xl p-3.5 flex flex-col gap-2"
    style={{
      background: 'rgba(22,22,30,0.90)',
      border: `1px solid ${color}14`,
    }}
  >
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center"
      style={{ background: `${color}12` }}
    >
      <Icon size={14} style={{ color }} />
    </div>
    <div>
      <p className="text-xl font-bold tracking-tight" style={{ color: '#F0F0F4' }}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#33333C' }}>
        {label}
      </p>
    </div>
  </motion.div>
)

export const Dashboard: React.FC = () => {
  const navigate      = useNavigate()
  const queryClient   = useQueryClient()
  const { addTask, removeTask, setAgents, setCmdPalette } = useAppStore()
  const [isCreating, setIsCreating] = useState(false)
  const [goal, setGoal] = useState('')
  const [focused, setFocused] = useState(false)

  const { data: tasks  = [] } = useQuery({ queryKey: ['tasks'],  queryFn: getTasks,   refetchInterval: 10000 })
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: getAgents,  refetchInterval: 8000  })
  const { data: stats       } = useQuery({ queryKey: ['stats'],  queryFn: getStats,   refetchInterval: 30000 })

  useEffect(() => {
    if (agents.length) setAgents(agents)
  }, [agents, setAgents])

  const createMutation = useMutation({
    mutationFn: createTask,
    onMutate:   () => setIsCreating(true),
    onSuccess:  (t) => {
      addTask(t)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      navigate(`/tasks/${t.id}`)
    },
    onError:    () => toast.error('Failed to create task. Check API connection in Settings.'),
    onSettled:  () => setIsCreating(false),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess:  (_, id) => { removeTask(id); queryClient.invalidateQueries({ queryKey: ['tasks'] }) },
    onError:    () => toast.error('Failed to delete task'),
  })

  const handleSubmit = () => {
    const g = goal.trim()
    if (!g || isCreating) return
    createMutation.mutate(g)
  }

  const recent = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const activeTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending').length

  const displayAgents = AGENT_INFO.map((info) => {
    const live = agents.find((a) => a.type?.toUpperCase() === info.type.toUpperCase())
    return live ?? { id: info.type, name: info.name, type: info.type as any, state: 'idle' as any, messages_count: 0 }
  })

  return (
    <div className="flex flex-col gap-6 pb-4">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <NexusGreeting taskCount={tasks.length} activeTasks={activeTasks} />

        {/* ⌘K hint */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => setCmdPalette(true)}
          className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all active:scale-95"
          style={{
            background: 'rgba(232,112,64,0.05)',
            border: '1px solid rgba(232,112,64,0.12)',
          }}
        >
          <Command size={11} style={{ color: '#E87040' }} />
          <span className="text-xs" style={{ color: '#55556A' }}>Quick commands</span>
          <kbd
            className="text-[9px] px-1.5 py-0.5 rounded font-mono ml-auto"
            style={{
              background: 'rgba(29,29,38,0.7)',
              color: '#55556A',
              border: '1px solid rgba(255,255,255,0.055)',
            }}
          >
            ⌘K
          </kbd>
        </motion.button>
      </div>

      {/* ── Main Input ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="px-4"
      >
        <div
          className="rounded-2xl overflow-hidden transition-all duration-200"
          style={{
            background: 'rgba(22,22,30,0.95)',
            border: focused ? '1px solid rgba(232,112,64,0.40)' : '1px solid rgba(255,255,255,0.055)',
            boxShadow: focused ? '0 0 0 3px rgba(232,112,64,0.08), 0 8px 32px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.25)',
          }}
        >
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
            }}
            placeholder="Describe your goal… what should the agents build, research, or write?"
            className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed px-4 pt-4 pb-2 placeholder-muted"
            style={{ color: '#F0F0F4', minHeight: 80 }}
            rows={3}
            disabled={isCreating}
          />

          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="text-[10px]" style={{ color: '#33333C' }}>
              Press Enter to launch · Shift+Enter for newline
            </span>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSubmit}
              disabled={!goal.trim() || isCreating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
              style={{
                background: goal.trim()
                  ? 'linear-gradient(135deg, #E87040, #C45A28)'
                  : 'rgba(29,29,38,0.8)',
                color: goal.trim() ? '#fff' : '#33333C',
                boxShadow: goal.trim() ? '0 4px 16px rgba(232,112,64,0.35)' : 'none',
              }}
            >
              {isCreating ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Launching…
                </>
              ) : (
                <>
                  <Send size={12} />
                  Launch
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ── Capability Chips ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="px-4"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#33333C' }}>
          Capabilities
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {CAPABILITIES.map((cap) => (
            <motion.button
              key={cap.label}
              whileTap={{ scale: 0.93 }}
              onClick={() => setGoal(cap.prompt)}
              disabled={isCreating}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all disabled:opacity-40"
              style={{
                background: goal.startsWith(cap.prompt)
                  ? 'rgba(232,112,64,0.10)'
                  : 'rgba(22,22,30,0.8)',
                border: goal.startsWith(cap.prompt)
                  ? '1px solid rgba(232,112,64,0.25)'
                  : '1px solid rgba(255,255,255,0.055)',
              }}
            >
              <span style={{ fontSize: 14 }}>{cap.icon}</span>
              <span
                className="text-[9px] font-semibold"
                style={{ color: goal.startsWith(cap.prompt) ? '#E87040' : '#55556A' }}
              >
                {cap.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Agent Network ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-4"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#33333C' }}>
          Agent Network
        </p>
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(10,10,14,0.75)',
            border: '1px solid rgba(232,112,64,0.08)',
          }}
        >
          <div className="flex items-end justify-around">
            {displayAgents.map((agent) => (
              <AgentOrb key={agent.id} agent={agent} size="md" showLabel />
            ))}
          </div>
          <p className="text-center text-[9px] mt-3" style={{ color: '#33333C' }}>
            5 specialized agents · Gemini 2.5 · Multi-modal reasoning
          </p>
        </div>
      </motion.div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={TrendingUp} label="Tasks"    value={stats?.total_tasks ?? tasks.length}              color="#E87040" delay={0.45} />
          <StatCard icon={Database}   label="Memories" value={stats?.memories_stored ?? 0}                    color="#2DD4BF" delay={0.50} />
          <StatCard icon={Users}      label="Agents"   value={stats?.agents_available ?? displayAgents.length} color="#9B8CE8" delay={0.55} />
        </div>
      </div>

      {/* ── Recent Tasks ──────────────────────────────────────────── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#33333C' }}>
            Recent Tasks
          </p>
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: '#E87040' }}
          >
            View all <ArrowRight size={12} />
          </button>
        </div>

        {recent.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-8 flex flex-col items-center gap-3"
            style={{
              background: 'rgba(10,10,14,0.65)',
              border: '1px solid rgba(255,255,255,0.055)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: 'rgba(232,112,64,0.07)',
                border: '1px solid rgba(232,112,64,0.14)',
              }}
            >
              ⚡
            </div>
            <p className="font-semibold text-sm" style={{ color: '#F0F0F4' }}>Ready to launch</p>
            <p className="text-xs text-center max-w-xs" style={{ color: '#55556A' }}>
              Describe something ambitious above — your agent team is standing by.
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <TaskCard task={task} onDelete={(id) => deleteMutation.mutate(id)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
