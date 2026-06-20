import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, Database, Users, TrendingUp, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AgentOrb } from '../components/UI/AgentOrb'
import { ChatInput } from '../components/Chat/ChatInput'
import { TaskCard } from '../components/Tasks/TaskCard'
import { NexusGreeting } from '../components/UI/NexusGreeting'
import { createTask, getTasks, getAgents, deleteTask, getStats } from '../lib/api'
import { useAppStore } from '../store/useAppStore'

const CAPABILITIES = [
  { icon: '🔍', label: 'Deep Research',   prompt: 'Research and synthesize the latest developments in quantum computing for a technical briefing' },
  { icon: '⚙️', label: 'Code & Build',    prompt: 'Build a Python REST API with authentication, rate limiting, and comprehensive error handling' },
  { icon: '✍️', label: 'Write & Create',  prompt: 'Write a detailed technical blog post explaining how transformer models work' },
  { icon: '📊', label: 'Analyze & Report', prompt: 'Analyze the current AI landscape and produce a structured market intelligence report' },
  { icon: '🧠', label: 'Learn & Adapt',   prompt: 'What have you learned from previous tasks? Summarize your knowledge base' },
]

const AGENT_INFO = [
  { type: 'STRATEGIST', name: 'NEXUS',  desc: 'Orchestrator', color: '#E87040' },
  { type: 'RESEARCHER', name: 'ARIA',   desc: 'Research',     color: '#38BDF8' },
  { type: 'CODER',      name: 'FORGE',  desc: 'Code',         color: '#2DD4BF' },
  { type: 'WRITER',     name: 'SCRIBE', desc: 'Write',        color: '#9B8CE8' },
  { type: 'MEMORY',     name: 'ECHO',   desc: 'Memory',       color: '#F5C518' },
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
      background: 'rgba(22,22,30,0.88)',
      border: `1px solid ${color}1C`,
    }}
  >
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center"
      style={{ background: `${color}14` }}
    >
      <Icon size={14} style={{ color }} aria-hidden="true" />
    </div>
    <div>
      <p className="text-xl font-bold tracking-tight" style={{ color: '#F0F0F4' }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#55556A' }}>
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
  const [activeChip, setActiveChip] = useState<number | null>(null)

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
    onSettled:  () => { setIsCreating(false); setActiveChip(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess:  (_, id) => { removeTask(id); queryClient.invalidateQueries({ queryKey: ['tasks'] }) },
    onError:    () => toast.error('Failed to delete task'),
  })

  const recent = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  const displayAgents = AGENT_INFO.map((info) => {
    const live = agents.find((a) => a.type?.toUpperCase() === info.type.toUpperCase())
    return live ?? { id: info.type, name: info.name, type: info.type as any, state: 'idle' as any, messages_count: 0 }
  })

  const runningCount  = tasks.filter((t) => t.status === 'running').length
  const doneCount     = tasks.filter((t) => t.status === 'completed').length

  return (
    <div className="flex flex-col gap-5 pb-4">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5">
        {/* NEXUS personality greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4"
        >
          <NexusGreeting />
        </motion.div>

        {/* Title block */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(232,112,64,0.08)', border: '1px solid rgba(232,112,64,0.16)' }}
            >
              <Zap size={9} style={{ color: '#E87040' }} aria-hidden="true" />
              <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: '#E87040' }}>
                Multi-Agent Intelligence
              </span>
            </div>
            {runningCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  background: 'rgba(232,112,64,0.10)',
                  border: '1px solid rgba(232,112,64,0.28)',
                  color: '#E87040',
                }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#E87040' }}
                />
                {runningCount} running
              </motion.div>
            )}
          </div>

          <h1
            className="text-[2.4rem] font-black leading-none mb-1.5 tracking-tight text-gradient-nexus"
          >
            NEXUS AI
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#55556A' }}>
            Research. Code. Write. Remember. Simultaneously.
          </p>
        </motion.div>

        {/* Chat input */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="-mx-4"
        >
          <ChatInput
            onSubmit={(g) => createMutation.mutate(g)}
            isLoading={isCreating}
            placeholder="Give me a goal — I'll orchestrate the agents to get it done…"
          />
        </motion.div>

        {/* Capability chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-4"
        >
          <p className="text-[9px] font-black uppercase tracking-widest mb-2.5" style={{ color: '#33333C' }}>
            Capabilities
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CAPABILITIES.map((cap, i) => (
              <motion.button
                key={cap.label}
                onClick={() => {
                  if (isCreating) return
                  setActiveChip(i)
                  createMutation.mutate(cap.prompt)
                }}
                disabled={isCreating}
                whileTap={{ scale: 0.94 }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all disabled:opacity-40"
                style={{
                  background: activeChip === i ? 'rgba(232,112,64,0.12)' : 'rgba(22,22,30,0.88)',
                  border: activeChip === i
                    ? '1px solid rgba(232,112,64,0.35)'
                    : '1px solid rgba(255,255,255,0.055)',
                  color: activeChip === i ? '#E87040' : '#8A8A9A',
                }}
              >
                <span aria-hidden="true">{cap.icon}</span>
                {cap.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Agent network ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#33333C' }}>
            Agent Network
          </p>
          <button
            onClick={() => setCmdPalette(true)}
            className="text-[10px] flex items-center gap-0.5"
            style={{ color: '#55556A' }}
          >
            ⌘K
          </button>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(16,16,22,0.9)',
            border: '1px solid rgba(232,112,64,0.08)',
          }}
        >
          <div className="flex items-end justify-around">
            {displayAgents.map((agent) => (
              <AgentOrb key={agent.id} agent={agent} size="md" showLabel />
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="px-4"
      >
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={TrendingUp} label="Tasks"     value={stats?.total_tasks ?? tasks.length}               color="#E87040" delay={0.05} />
          <StatCard icon={Database}   label="Memories"  value={stats?.memories_stored ?? 0}                     color="#4ADE80" delay={0.10} />
          <StatCard icon={Users}      label="Agents"    value={stats?.agents_available ?? displayAgents.length}  color="#9B8CE8" delay={0.15} />
        </div>
      </motion.div>

      {/* ── Recent tasks ──────────────────────────────────────────────── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#33333C' }}>
            Recent Tasks
          </p>
          {tasks.length > 0 && (
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: '#E87040' }}
            >
              All {tasks.length} <ArrowRight size={11} aria-hidden="true" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {recent.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
              style={{ background: 'rgba(16,16,22,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(232,112,64,0.07)', border: '1px solid rgba(232,112,64,0.14)' }}
              >
                ⚡
              </div>
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: '#F0F0F4' }}>Ready to launch</p>
                <p className="text-xs leading-relaxed max-w-[220px]" style={{ color: '#55556A' }}>
                  Describe any goal above — your agent team deploys instantly.
                </p>
              </div>
              {doneCount > 0 && (
                <p className="text-[10px]" style={{ color: '#33333C' }}>
                  {doneCount} task{doneCount > 1 ? 's' : ''} completed
                </p>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <TaskCard task={task} onDelete={(id) => deleteMutation.mutate(id)} />
                </motion.div>
              ))}
              {tasks.length > 4 && (
                <button
                  onClick={() => navigate('/tasks')}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium"
                  style={{
                    background: 'rgba(22,22,30,0.5)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    color: '#55556A',
                  }}
                >
                  View {tasks.length - 4} more <ChevronRight size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
