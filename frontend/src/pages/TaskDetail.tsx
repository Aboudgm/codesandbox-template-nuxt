import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Trash2, Pause, Play, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTask, deleteTask, pauseTask, resumeTask } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { useTaskWebSocket } from '../lib/websocket'
import { TaskTimeline } from '../components/Tasks/TaskTimeline'
import { AgentCard } from '../components/Agents/AgentCard'
import { GlassCard } from '../components/UI/GlassCard'
import { StatusBadge } from '../components/UI/StatusBadge'
import type { Task, AgentMessage } from '../types'

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { updateTask, removeTask, agents } = useAppStore()
  const [localMessages, setLocalMessages] = useState<AgentMessage[]>([])
  const [showResult, setShowResult] = useState(true)

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'running' ? 3000 : false
    },
  })

  // WebSocket for real-time updates
  const handleWsMessage = useCallback(
    (msg: { type: string; message?: AgentMessage; status?: string; result?: string }) => {
      if (msg.type === 'message' && msg.message) {
        setLocalMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.message!.id)
          if (exists) return prev
          return [...prev, msg.message!]
        })
      } else if (msg.type === 'status_update' && id) {
        updateTask(id, { status: msg.status as Task['status'] })
        queryClient.invalidateQueries({ queryKey: ['task', id] })
      } else if (msg.type === 'task_complete' && id) {
        updateTask(id, { status: 'completed', result: msg.result })
        queryClient.invalidateQueries({ queryKey: ['task', id] })
        toast.success('Task completed!')
      } else if (msg.type === 'task_failed' && id) {
        updateTask(id, { status: 'failed' })
        toast.error('Task failed')
      }
    },
    [id, updateTask, queryClient]
  )

  useTaskWebSocket(id ?? null, handleWsMessage)

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(id!),
    onSuccess: () => {
      removeTask(id!)
      navigate('/tasks')
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const pauseMutation = useMutation({
    mutationFn: () => pauseTask(id!),
    onSuccess: (updated) => {
      updateTask(id!, { status: updated.status })
      queryClient.invalidateQueries({ queryKey: ['task', id] })
    },
    onError: () => toast.error('Failed to pause task'),
  })

  const resumeMutation = useMutation({
    mutationFn: () => resumeTask(id!),
    onSuccess: (updated) => {
      updateTask(id!, { status: updated.status })
      queryClient.invalidateQueries({ queryKey: ['task', id] })
    },
    onError: () => toast.error('Failed to resume task'),
  })

  // Combine fetched + live messages, deduplicate
  const allMessages = React.useMemo(() => {
    const base = task?.messages ?? []
    const combined = [...base]
    for (const msg of localMessages) {
      if (!combined.some((m) => m.id === msg.id)) {
        combined.push(msg)
      }
    }
    return combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [task?.messages, localMessages])

  // Active agents for this task
  const taskAgents = agents.filter((a) => task?.agents.includes(a.id))

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl animate-pulse"
            style={{ background: 'rgba(26,26,46,0.6)' }}
          />
        ))}
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 gap-4">
        <AlertCircle size={48} className="text-error opacity-60" />
        <p className="text-text-secondary text-center">Task not found or failed to load</p>
        <button
          onClick={() => navigate('/tasks')}
          className="px-4 py-2 rounded-xl text-sm font-medium text-primary"
          style={{ background: 'rgba(217,119,87,0.1)', border: '1px solid rgba(217,119,87,0.2)' }}
        >
          Back to Tasks
        </button>
      </div>
    )
  }

  const isRunning = task.status === 'running'
  const isPaused = task.status === 'paused'
  const isCompleted = task.status === 'completed'
  const isFailed = task.status === 'failed'

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Task header card */}
      <div className="px-4">
        <GlassCard>
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-sm font-medium text-text-primary leading-snug flex-1">
              {task.goal}
            </p>
            <StatusBadge status={task.status} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isRunning && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: 'rgba(255,183,77,0.12)',
                  border: '1px solid rgba(255,183,77,0.25)',
                  color: '#FFB74D',
                }}
              >
                <Pause size={13} />
                Pause
              </motion.button>
            )}

            {isPaused && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: 'rgba(78,204,163,0.12)',
                  border: '1px solid rgba(78,204,163,0.25)',
                  color: '#4ECCA3',
                }}
              >
                <Play size={13} />
                Resume
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (window.confirm('Delete this task?')) deleteMutation.mutate()
              }}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ml-auto"
              style={{
                background: 'rgba(239,83,80,0.1)',
                border: '1px solid rgba(239,83,80,0.2)',
                color: '#EF5350',
              }}
            >
              <Trash2 size={13} />
              Delete
            </motion.button>
          </div>
        </GlassCard>
      </div>

      {/* Active agents */}
      {taskAgents.length > 0 && (
        <div className="px-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">
            Active Agents
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {taskAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">
          Agent Messages ({allMessages.length})
        </h3>
        <GlassCard padding={false}>
          <TaskTimeline messages={allMessages} isLive={isRunning} />
        </GlassCard>
      </div>

      {/* Result section */}
      <AnimatePresence>
        {(isCompleted || isFailed) && task.result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 size={14} className="text-success" />
                ) : (
                  <AlertCircle size={14} className="text-error" />
                )}
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                  {isCompleted ? 'Result' : 'Error'}
                </h3>
              </div>
              <button
                onClick={() => setShowResult(!showResult)}
                className="text-xs text-text-muted"
              >
                {showResult ? 'Hide' : 'Show'}
              </button>
            </div>

            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <GlassCard
                    glow={isCompleted ? '#4ECCA3' : '#EF5350'}
                    padding={false}
                  >
                    <div className="p-4">
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            code({ className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className ?? '')
                              const codeStr = String(children).replace(/\n$/, '')
                              if (match) {
                                return (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{ margin: '8px 0', borderRadius: '8px', fontSize: '12px' }}
                                    {...props}
                                  >
                                    {codeStr}
                                  </SyntaxHighlighter>
                                )
                              }
                              return (
                                <code
                                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                                  style={{ background: 'rgba(79,195,247,0.12)', color: '#4FC3F7' }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              )
                            },
                            p: ({ children }) => (
                              <p className="text-text-primary text-sm leading-relaxed mb-2">{children}</p>
                            ),
                          }}
                        >
                          {task.result}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
