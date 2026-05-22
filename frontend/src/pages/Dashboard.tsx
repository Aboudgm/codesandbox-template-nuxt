import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Database, Users, TrendingUp, Command, ArrowRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AgentOrb } from '../components/UI/AgentOrb'
import { ChatInput } from '../components/Chat/ChatInput'
import { TaskCard } from '../components/Tasks/TaskCard'
import { GlassCard } from '../components/UI/GlassCard'
import { createTask, getTasks, getAgents, deleteTask, getStats } from '../lib/api'
import { useAppStore } from '../store/useAppStore'

const QUICK_GOALS = [
  'Research recent breakthroughs in quantum computing',
  'Write a Python web scraper for news headlines',
  'Analyze AI benchmark trends in 2024–2025',
  'Create a market research report on EVs',
]

const AGENT_INFO = [
  { type: 'STRATEGIST', name: 'NEXUS', desc: 'Orchestrator' },
  { type: 'RESEARCHER', name: 'ARIA',  desc: 'Research'     },
  { type: 'CODER',      name: 'FORGE', desc: 'Code'         },
  { type: 'WRITER',     name: 'SCRIBE',desc: 'Writer'       },
  { type: 'MEMORY',     name: 'ECHO',  desc: 'Memory'       },
]

const StatCard: React.FC<{
  icon: React.ElementType; label: string; value: string | number; color: string; delay?: number
}> = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    className="rounded-2xl p-3.5 flex flex-col gap-2.5"
    style={{
      background: 'rgba(10,10,26,0.8)',
      border: `1px solid ${color}20`,
    }}
  >
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center"
      style={{ background: `${color}18` }}
    >
      <Icon size={16} style={{ color }} />
    </div>
    <div>
      <p className="text-2xl font-bold" style={{ color: '#E8E8F8' }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4A4A70' }}>
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

  const recent = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Build agent list: merge API agents with fallback display list
  const displayAgents = AGENT_INFO.map((info) => {
    const live = agents.find((a) => a.type?.toUpperCase() === info.type.toUpperCase())
    return live ?? { id: info.type, name: info.name, type: info.type as any, state: 'idle' as any, messages_count: 0 }
  })

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={13} style={{ color: '#D97757' }} />
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#4A4A70' }}>
              Multi-Agent Command Center
            </span>
          </div>
          <h1 className="text-3xl font-black mb-1 text-gradient-nexus">NEXUS AI</h1>
          <p className="text-sm leading-relaxed" style={{ color: '#4A4A70' }}>
            Orchestrate autonomous agents to research, code, and create.
          </p>

          {/* ⌘K hint */}
          <button
            onClick={() => setCmdPalette(true)}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)' }}
          >
            <Command size={11} style={{ color: '#00E5FF' }} />
            <span className="text-xs" style={{ color: '#4A4A70' }}>Quick commands</span>
            <kbd
              className="text-[9px] px-1 py-0.5 rounded"
              style={{ background: 'rgba(30,32,64,0.6)', color: '#4A4A70', fontFamily: 'monospace', border: '1px solid rgba(30,32,64,0.8)' }}
            >
              ⌘K
            </kbd>
          </button>
        </motion.div>

        {/* Chat input */}
        <div className="-mx-4">
          <ChatInput onSubmit={(g) => createMutation.mutate(g)} isLoading={isCreating} />
        </div>

        {/* Quick goals */}
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#2A2A50' }}>
            Quick Start
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_GOALS.map((g) => (
              <motion.button
                key={g}
                onClick={() => !isCreating && createMutation.mutate(g)}
                disabled={isCreating}
                whileTap={{ scale: 0.96 }}
                className="text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
                style={{
                  background: 'rgba(15,15,32,0.7)',
                  border: '1px solid rgba(30,32,64,0.7)',
                  color: '#4A4A70',
                }}
              >
                {g}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Agent orbs ────────────────────────────────────────────── */}
      <div className="px-4">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#2A2A50' }}>
          Agent Network
        </p>
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(10,10,26,0.7)',
            border: '1px solid rgba(0,229,255,0.08)',
          }}
        >
          <div className="flex items-end justify-around">
            {displayAgents.map((agent) => (
              <AgentOrb key={agent.id} agent={agent} size="md" showLabel />
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={TrendingUp} label="Tasks"    value={stats?.total_tasks ?? tasks.length}    color="#D97757" delay={0.05} />
          <StatCard icon={Database}   label="Memories" value={stats?.memories_stored ?? 0}           color="#00E5FF" delay={0.10} />
          <StatCard icon={Users}      label="Agents"   value={stats?.agents_available ?? displayAgents.length} color="#00FFB3" delay={0.15} />
        </div>
      </div>

      {/* ── Recent tasks ──────────────────────────────────────────── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2A2A50' }}>
            Recent Tasks
          </p>
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#D97757' }}
          >
            View all <ArrowRight size={12} />
          </button>
        </div>

        {recent.length === 0 ? (
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-3"
            style={{ background: 'rgba(10,10,26,0.6)', border: '1px solid rgba(30,32,64,0.5)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.1)' }}
            >
              ⚡
            </div>
            <p className="font-semibold text-sm" style={{ color: '#E8E8F8' }}>Ready to launch</p>
            <p className="text-xs text-center max-w-xs" style={{ color: '#4A4A70' }}>
              Enter a goal above and your multi-agent team will research, code, and write a comprehensive result.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
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
