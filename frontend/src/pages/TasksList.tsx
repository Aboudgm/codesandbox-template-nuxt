import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X, RefreshCw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTasks, deleteTask } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { TaskCard } from '../components/Tasks/TaskCard'
import type { TaskStatus } from '../types'

type Filter = 'all' | TaskStatus

const FILTERS: { key: Filter; label: string; color: string }[] = [
  { key: 'all',       label: 'All',     color: '#8A8A9A' },
  { key: 'running',   label: 'Running', color: '#E87040' },
  { key: 'completed', label: 'Done',    color: '#2DD4BF' },
  { key: 'failed',    label: 'Failed',  color: '#EF6060' },
  { key: 'pending',   label: 'Pending', color: '#38BDF8' },
]

export const TasksList: React.FC = () => {
  const queryClient = useQueryClient()
  const { removeTask } = useAppStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const { data: tasks = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn:  getTasks,
    refetchInterval: 12000,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess:  (_, id) => {
      removeTask(id)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const filtered = tasks.filter((t) => {
    const matchFilter = filter === 'all' || t.status === filter
    const matchSearch = !search.trim() || t.goal.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const counts = tasks.reduce(
    (acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base" style={{ color: '#F0F0F4' }}>Tasks</h2>
          <p className="text-xs" style={{ color: '#33333C' }}>{tasks.length} total</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
          style={{
            background: 'rgba(232,112,64,0.07)',
            border: '1px solid rgba(232,112,64,0.18)',
            color: '#E87040',
          }}
        >
          {isFetching
            ? <Loader2 size={12} className="animate-spin" />
            : <RefreshCw size={12} />
          }
          Refresh
        </motion.button>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
        style={{
          background: 'rgba(22,22,30,0.90)',
          border: '1px solid rgba(255,255,255,0.055)',
        }}
      >
        <Search size={14} style={{ color: '#33333C', flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="flex-1 bg-transparent text-sm outline-none placeholder-muted"
          style={{ color: '#F0F0F4' }}
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search">
            <X size={13} style={{ color: '#33333C' }} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? tasks.length : (counts[f.key] ?? 0)
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: active ? `${f.color}12` : 'rgba(22,22,30,0.8)',
                border: active ? `1px solid ${f.color}30` : '1px solid rgba(255,255,255,0.055)',
                color: active ? f.color : '#55556A',
              }}
            >
              {f.label}
              {count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{
                    background: active ? `${f.color}18` : 'rgba(29,29,38,0.7)',
                    color: active ? f.color : '#55556A',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: '#E87040' }} />
        </div>
      ) : sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-8 flex flex-col items-center gap-3"
          style={{
            background: 'rgba(22,22,30,0.65)',
            border: '1px solid rgba(255,255,255,0.055)',
          }}
        >
          <span className="text-3xl">⚡</span>
          <p className="text-sm font-medium" style={{ color: '#F0F0F4' }}>
            {search
              ? 'No matching tasks'
              : filter === 'all'
              ? 'No tasks yet'
              : `No ${filter} tasks`}
          </p>
          <p className="text-xs text-center" style={{ color: '#55556A' }}>
            {!search && filter === 'all'
              ? 'Describe something ambitious above — no task too big.'
              : ''}
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {sorted.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
              >
                <TaskCard task={task} onDelete={(id) => deleteMutation.mutate(id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
