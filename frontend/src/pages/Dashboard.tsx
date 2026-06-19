import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Database, Users, TrendingUp, Command, ArrowRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AgentOrb } from '../components/UI/AgentOrb'
import { ChatInput } from '../components/Chat/ChatInput'
import { TaskCard } from '../components/Tasks/TaskCard'
import { createTask, getTasks, getAgents, deleteTask, getStats } from '../lib/api'
import { useAppStore } from '../store/useAppStore'

const QUICK_GOALS = [
  'Research quantum computing breakthroughs',
  'Write a Python web scraper',
  'Analyze AI benchmark trends',
  'Create an EV market research report',
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
    transition={{ delay, duration: 0.3 }}
    className="rounded-2xl p-3.5 flex flex-col gap-2"
    style={{
      background: 'rgba(12,10,20,0.8)',
      border: `1px solid ${color}1A`,
    }}
  >
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center"
      style={{ background: `${color}14` }}
    >
      <Icon size={14} style={{ color }} />
    </div>
    <div>
      <p className="text-xl font-bold tracking-tight" style={{ color: '#EEEEF0' }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#38384A' }}>
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

  const displayAgents = AGENT_INFO.map((info) => {
    const live = agents.find((a) => a.type?.toUpperCase() === info.type.toUpperCase())
    return live ?? { id: info.type, name: info.name, type: info.type as any, state: 'idle' as any, messages_count: 0 }
  })

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(217,119,87,0.08)', border: '1px solid rgba(217,119,87,0.18)' }}
            >
              <Zap size={10} style={{ color: '#D97757' }} />
              <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#D97757' }}>
                Multi-Agent AI
              </span>
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-[2.2rem] font-black mb-1.5 leading-none"
            style={{
              background: 'linear-gradient(135deg, #F0EEE8 0%, #D97757 50%, #C084FC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            NEXUS AI
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#4A4A6A' }}>
            Orchestrate autonomous agents to research, code, and create.
          </p>

          {/* ⌘K hint */}
          <button
            onClick={() => setCmdPalette(true)}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all active:scale-95"
            style={{
              background: 'rgba(217,119,87,0.06)',
              border: '1px solid rgba(217,119,87,0.14)',
            }}
          >
            <Command size={11} style={{ color: '#D97757' }} />
            <span className="text-xs" style={{ color: '#4A4A6A' }}>Quick commands</span>
            <kbd
              className="text-[9px] px-1.5 py-0.5 rounded font-mono"
              style={{
                background: 'rgba(30,28,42,0.7)',
                color: '#4A4A6A',
                border: '1px solid rgba(50,46,68,0.6)',
              }}
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
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#2A2A3A' }}>
            Quick Start
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_GOALS.map((g) => (
              <motion.button
                key={g}
                onClick={() => !isCreating && createMutation.mutate(g)}
                disabled={isCreating}
                whileTap={{ scale: 0.95 }}
                className="text-xs px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40"
                style={{
                  background: 'rgba(14,12,22,0.75)',
                  border: '1px solid rgba(50,46,68,0.6)',
                  color: '#4A4A6A',
                }}
              >
                {g}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Agent network ─────────────────────────────────────────── */}
      <div className="px-4">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#2A2A3A' }}>
          Agent Network
        </p>
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(10,8,18,0.75)',
            border: '1px solid rgba(217,119,87,0.09)',
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
          <StatCard icon={TrendingUp} label="Tasks"    value={stats?.total_tasks ?? tasks.length}              color="#D97757" delay={0.05} />
          <StatCard icon={Database}   label="Memories" value={stats?.memories_stored ?? 0}                    color="#00FFB3" delay={0.10} />
          <StatCard icon={Users}      label="Agents"   value={stats?.agents_available ?? displayAgents.length} color="#C084FC" delay={0.15} />
        </div>
      </div>

      {/* ── Recent tasks ──────────────────────────────────────────── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2A2A3A' }}>
            Recent Tasks
          </p>
          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: '#D97757' }}
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
              background: 'rgba(10,8,18,0.65)',
              border: '1px solid rgba(50,46,68,0.45)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: 'rgba(217,119,87,0.07)',
                border: '1px solid rgba(217,119,87,0.14)',
              }}
            >
              ⚡
            </div>
            <p className="font-semibold text-sm" style={{ color: '#EEEEF0' }}>Ready to launch</p>
            <p className="text-xs text-center max-w-xs" style={{ color: '#4A4A6A' }}>
              Enter a goal and your multi-agent team will research, code, and write a comprehensive result.
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
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
