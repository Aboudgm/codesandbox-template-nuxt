import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Trash2, Pause, Play, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTask, deleteTask, pauseTask, resumeTask } from '../lib/api'
import { connectTaskStream } from '../lib/stream'
import { notifyTaskComplete } from '../lib/notifications'
import { useAppStore } from '../store/useAppStore'
import { StreamOutput } from '../components/UI/StreamOutput'
import { StatusBadge } from '../components/UI/StatusBadge'
import type { Task, StreamEvent } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

function formatDuration(start: string, end?: string): string {
  const ms = new Date(end ?? Date.now()).getTime() - new Date(start).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

// ─── Result View ──────────────────────────────────────────────────────────────

const ResultView: React.FC<{ result: string }> = ({ result }) => (
  <div
    className="rounded-2xl p-4 mt-4"
    style={{
      background: 'rgba(0,255,179,0.04)',
      border: '1px solid rgba(0,255,179,0.18)',
    }}
  >
    <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid rgba(0,255,179,0.1)' }}>
      <CheckCircle2 size={14} style={{ color: '#00FFB3' }} />
      <span className="text-xs font-bold tracking-wide" style={{ color: '#00FFB3' }}>
        Final Output
      </span>
    </div>
    <div
      className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed"
      style={{ color: '#C8C8E8' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isBlock = match != null
            return isBlock ? (
              <SyntaxHighlighter
                style={vscDarkPlus as any}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className={className}
                style={{ background: 'rgba(0,229,255,0.08)', padding: '1px 5px', borderRadius: 4, fontSize: '0.8em' }}
                {...props}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {result}
      </ReactMarkdown>
    </div>
  </div>
)

// ─── ThinkingIndicator ────────────────────────────────────────────────────────

const ThinkingIndicator: React.FC<{ agentName: string }> = ({ agentName }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center gap-2 py-2"
  >
    <Loader2 size={12} className="animate-spin" style={{ color: '#D97757' }} />
    <span className="text-xs" style={{ color: '#4A4A70' }}>
      {agentName} is working
    </span>
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#4A4A70' }}
        />
      ))}
    </div>
  </motion.div>
)

// ─── Main component ───────────────────────────────────────────────────────────

export const TaskDetail: React.FC = () => {
  const { id }             = useParams<{ id: string }>()
  const navigate           = useNavigate()
  const queryClient        = useQueryClient()
  const { updateTask, removeTask } = useAppStore()
  const bottomRef          = useRef<HTMLDivElement>(null)

  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([])
  const [streaming, setStreaming]       = useState(false)
  const [showResult, setShowResult]     = useState(true)
  const [lastAgentName, setLastAgentName] = useState<string>('NEXUS')

  // ── Fetch task ─────────────────────────────────────────────────────────────
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn:  () => getTask(id!),
    refetchInterval: (query: any) =>
      (query.state.data?.status === 'running' || query.state.data?.status === 'pending') ? 4000 : false,
  })

  // Update store when task changes
  useEffect(() => {
    if (task) {
      updateTask(task.id, { status: task.status, result: task.result })
      if (task.status === 'completed') {
        notifyTaskComplete(task.id, task.goal, true)
      } else if (task.status === 'failed') {
        notifyTaskComplete(task.id, task.goal, false)
      }
    }
  }, [task?.status, task?.id, updateTask])

  // ── SSE stream ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !task) return
    if (task.status !== 'running' && task.status !== 'pending') {
      // Show stored messages as stream events
      if (task.messages?.length) {
        const asEvents: StreamEvent[] = task.messages.map((m) => ({
          id:         m.id,
          type:       'output' as const,
          task_id:    id,
          agent_id:   m.agent_type,
          agent_name: m.agent_type,
          agent_type: m.agent_type,
          content:    m.content,
          metadata:   m.metadata ?? {},
          timestamp:  m.timestamp,
        }))
        setStreamEvents(asEvents)
      }
      return
    }

    setStreaming(true)
    const disconnect = connectTaskStream(id, (event) => {
      if (event.type === 'done' || event.type === 'task_done') {
        setStreaming(false)
        queryClient.invalidateQueries({ queryKey: ['task', id] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        return
      }
      const e = event as StreamEvent
      setStreamEvents((prev) => [...prev, e])
      if (e.agent_name) setLastAgentName(e.agent_name)
    })

    return () => { disconnect(); setStreaming(false) }
  }, [id, task?.status])

  // Auto-scroll to bottom as events stream in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [streamEvents.length])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(id!),
    onSuccess:  () => { removeTask(id!); navigate('/tasks') },
    onError:    () => toast.error('Failed to delete task'),
  })

  const pauseMutation = useMutation({
    mutationFn: () => pauseTask(id!),
    onSuccess:  (t) => { updateTask(t.id, { status: t.status }); queryClient.invalidateQueries({ queryKey: ['task', id] }) },
    onError:    () => toast.error('Failed to pause task'),
  })

  const resumeMutation = useMutation({
    mutationFn: () => resumeTask(id!),
    onSuccess:  (t) => { updateTask(t.id, { status: t.status }); queryClient.invalidateQueries({ queryKey: ['task', id] }) },
    onError:    () => toast.error('Failed to resume task'),
  })

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={24} className="animate-spin" style={{ color: '#00E5FF' }} />
    </div>
  )
  if (!task) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6">
      <AlertCircle size={32} style={{ color: '#FF5370' }} />
      <p className="text-sm" style={{ color: '#4A4A70' }}>Task not found</p>
    </div>
  )

  const isActive = task.status === 'running' || task.status === 'pending'

  return (
    <div className="flex flex-col gap-0 px-4 pb-6">
      {/* ── Task Header ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-4"
      >
        {/* Goal */}
        <p className="text-base font-semibold mb-3 leading-snug" style={{ color: '#E8E8F8' }}>
          {task.goal}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={task.status} />

          <div className="flex items-center gap-1.5" style={{ color: '#4A4A70' }}>
            <Clock size={11} />
            <span className="text-[10px]">{timeAgo(task.created_at)}</span>
          </div>

          {task.status === 'completed' && (
            <div className="flex items-center gap-1" style={{ color: '#00FFB3' }}>
              <CheckCircle2 size={11} />
              <span className="text-[10px]">{formatDuration(task.created_at, task.updated_at)}</span>
            </div>
          )}

          {streamEvents.length > 0 && (
            <span className="text-[10px]" style={{ color: '#4A4A70' }}>
              {streamEvents.length} events
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          {task.status === 'running' && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(255,179,0,0.1)', border: '1px solid rgba(255,179,0,0.25)', color: '#FFB74D' }}
            >
              <Pause size={12} /> Pause
            </motion.button>
          )}
          {task.status === 'paused' && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)', color: '#00E5FF' }}
            >
              <Play size={12} /> Resume
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              if (window.confirm('Delete this task?')) deleteMutation.mutate()
            }}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(255,83,112,0.08)', border: '1px solid rgba(255,83,112,0.2)', color: '#FF5370' }}
          >
            <Trash2 size={12} /> Delete
          </motion.button>
        </div>
      </motion.div>

      {/* ── Stream view ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-2"
        style={{
          background: 'rgba(10,10,26,0.8)',
          border: isActive ? '1px solid rgba(0,229,255,0.12)' : '1px solid rgba(30,32,64,0.5)',
          minHeight: 120,
        }}
      >
        {/* Stream header */}
        <div
          className="flex items-center justify-between mb-3 pb-2"
          style={{ borderBottom: '1px solid rgba(30,32,64,0.5)' }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={isActive ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: isActive ? '#00E5FF' : task.status === 'completed' ? '#00FFB3' : '#FF5370' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4A4A70' }}>
              {isActive ? 'Live Stream' : 'Event Log'}
            </span>
          </div>
          <span className="text-[9px]" style={{ color: '#2A2A50' }}>
            {streamEvents.length} events
          </span>
        </div>

        {/* Events */}
        {streamEvents.length === 0 && !isActive ? (
          <p className="text-xs text-center py-6" style={{ color: '#2A2A50' }}>
            No events recorded
          </p>
        ) : (
          <StreamOutput events={streamEvents} />
        )}

        {/* Live thinking indicator */}
        {isActive && streaming && (
          <ThinkingIndicator agentName={lastAgentName} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Final result ──────────────────────────────────────────────── */}
      {task.result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button
            onClick={() => setShowResult((v) => !v)}
            className="flex items-center gap-2 w-full px-1 py-2"
          >
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#00FFB3' }}>
              Final Result
            </span>
            {showResult ? <ChevronUp size={14} style={{ color: '#00FFB3' }} /> : <ChevronDown size={14} style={{ color: '#00FFB3' }} />}
          </button>
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <ResultView result={task.result} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Failed state */}
      {task.status === 'failed' && !task.result && (
        <div
          className="rounded-2xl p-4 mt-2"
          style={{ background: 'rgba(255,83,112,0.06)', border: '1px solid rgba(255,83,112,0.2)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: '#FF5370' }}>Task Failed</p>
          <p className="text-xs" style={{ color: '#4A4A70' }}>
            Check Settings to ensure an API key is configured. The task can be deleted and retried.
          </p>
        </div>
      )}
    </div>
  )
}
