import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Database, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ChatInput } from '../components/Chat/ChatInput'
import { AgentGraph } from '../components/Agents/AgentGraph'
import { TaskCard } from '../components/Tasks/TaskCard'
import { GlassCard } from '../components/UI/GlassCard'
import { createTask, getTasks, getAgents, deleteTask, getStats } from '../lib/api'
import { useAppStore } from '../store/useAppStore'

const QUICK_GOALS = [
  'Research quantum computing breakthroughs 2024',
  'Write a Python web scraper for news articles',
  'Analyze recent AI model benchmarks',
  'Create a market research report on EVs',
]

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  delay?: number
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
  >
    <GlassCard glow={color} padding={false}>
      <div className="p-3 flex flex-col gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <p className="text-xl font-bold text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </div>
    </GlassCard>
  </motion.div>
)

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addTask, removeTask, setAgents } = useAppStore()
  const [isCreating, setIsCreating] = useState(false)

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
    refetchInterval: 10000,
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    refetchInterval: 8000,
  })

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (agents.length > 0) setAgents(agents)
  }, [agents, setAgents])

  const createMutation = useMutation({
    mutationFn: createTask,
    onMutate: () => setIsCreating(true),
    onSuccess: (newTask) => {
      addTask(newTask)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created! Agents are working...')
      navigate(`/tasks/${newTask.id}`)
    },
    onError: () => {
      toast.error('Failed to create task. Check your API connection.')
    },
    onSettled: () => setIsCreating(false),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, id) => {
      removeTask(id)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const handleGoalSubmit = (goal: string) => {
    createMutation.mutate(goal)
  }

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6 px-0 pb-4">
      {/* Hero section */}
      <div className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-primary" />
            <span className="text-xs font-medium text-text-muted uppercase tracking-widest">
              Multi-Agent AI
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-1">
            <span
              style={{
                background: 'linear-gradient(135deg, #F0F0F8 0%, #D97757 50%, #7C71F0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NEXUS AI
            </span>
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Orchestrate multiple AI agents to accomplish complex tasks
          </p>
        </motion.div>

        {/* Chat Input */}
        <div className="-mx-4">
          <ChatInput onSubmit={handleGoalSubmit} isLoading={isCreating} />
        </div>

        {/* Quick start chips */}
        <div className="mt-4">
          <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
            Quick Start
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_GOALS.map((goal) => (
              <motion.button
                key={goal}
                onClick={() => !isCreating && handleGoalSubmit(goal)}
                disabled={isCreating}
                whileTap={{ scale: 0.96 }}
                className="text-xs px-3 py-2 rounded-xl border transition-colors disabled:opacity-50"
                style={{
                  background: 'rgba(26,26,46,0.6)',
                  borderColor: 'rgba(42,45,74,0.6)',
                  color: '#9096B8',
                }}
              >
                {goal}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={TrendingUp}
            label="Tasks"
            value={stats?.total_tasks ?? tasks.length}
            color="#D97757"
            delay={0.1}
          />
          <StatCard
            icon={Database}
            label="Memories"
            value={stats?.memories_stored ?? 0}
            color="#7C71F0"
            delay={0.15}
          />
          <StatCard
            icon={Users}
            label="Agents"
            value={stats?.agents_available ?? agents.length || 5}
            color="#4FC3F7"
            delay={0.2}
          />
        </div>
      </div>

      {/* Agent graph */}
      <div className="px-4">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
          Agent Network
        </h2>
        <GlassCard padding={false}>
          <div className="p-3 pb-1">
            <AgentGraph agents={agents} />
          </div>
        </GlassCard>
      </div>

      {/* Recent tasks */}
      {recentTasks.length > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
              Recent Tasks
            </h2>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs text-primary font-medium"
            >
              View all
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {recentTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TaskCard
                  task={task}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentTasks.length === 0 && (
        <div className="px-4">
          <GlassCard>
            <div className="flex flex-col items-center py-8 gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(42,45,74,0.4)' }}
              >
                🚀
              </div>
              <p className="text-text-primary font-medium text-center">Ready to start</p>
              <p className="text-text-muted text-sm text-center max-w-xs">
                Enter a goal above and your AI agents will work together to accomplish it
              </p>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
