import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTasks, deleteTask } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { TaskCard } from '../components/Tasks/TaskCard'
import type { TaskStatus } from '../types'

type FilterTab = 'all' | TaskStatus

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'completed', label: 'Done' },
  { key: 'failed', label: 'Failed' },
  { key: 'pending', label: 'Pending' },
]

export const TasksList: React.FC = () => {
  const queryClient = useQueryClient()
  const { removeTask } = useAppStore()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartY = useRef(0)

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
    refetchInterval: 15000,
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (listRef.current && listRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0) {
      const delta = e.touches[0].clientY - touchStartY.current
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.4, 60))
      }
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 40) {
      await handleRefresh()
    }
    setPullDistance(0)
    touchStartY.current = 0
  }

  const filteredTasks = tasks
    .filter((t) => activeFilter === 'all' || t.status === activeFilter)
    .filter((t) =>
      search.trim() === '' || t.goal.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const runningCount = tasks.filter((t) => t.status === 'running').length

  return (
    <div className="flex flex-col h-full">
      {/* Header area */}
      <div className="px-4 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-text-primary font-semibold">{tasks.length}</span>
            <span className="text-text-muted text-sm ml-1">total tasks</span>
            {runningCount > 0 && (
              <span
                className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(217,119,87,0.15)', color: '#D97757' }}
              >
                {runningCount} running
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'rgba(42,45,74,0.5)' }}
          >
            <RefreshCw
              size={16}
              className={`text-text-secondary ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </motion.button>
        </div>

        {/* Search bar */}
        <div
          className="flex items-center gap-2 rounded-xl px-3"
          style={{
            background: 'rgba(26,26,46,0.8)',
            border: '1px solid rgba(42,45,74,0.6)',
            height: '44px',
          }}
        >
          <Search size={15} className="text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearch('')}
              >
                <X size={14} className="text-text-muted" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_TABS.map(({ key, label }) => {
            const count = key === 'all' ? tasks.length : tasks.filter((t) => t.status === key).length
            const isActive = activeFilter === key
            return (
              <motion.button
                key={key}
                onClick={() => setActiveFilter(key)}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: isActive ? 'rgba(217,119,87,0.15)' : 'rgba(42,45,74,0.4)',
                  border: isActive ? '1px solid rgba(217,119,87,0.3)' : '1px solid transparent',
                  color: isActive ? '#D97757' : '#5A6080',
                }}
              >
                {label}
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{
                      background: isActive ? 'rgba(217,119,87,0.25)' : 'rgba(42,45,74,0.8)',
                      color: isActive ? '#D97757' : '#5A6080',
                    }}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {pullDistance > 10 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: pullDistance }}
            exit={{ height: 0 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <RefreshCw
              size={16}
              className="text-primary"
              style={{ transform: `rotate(${pullDistance * 4}deg)` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && (
          <div className="flex flex-col gap-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl animate-pulse"
                style={{ background: 'rgba(26,26,46,0.6)' }}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: 'rgba(42,45,74,0.3)' }}
            >
              {search ? '🔍' : '📋'}
            </div>
            <div className="text-center">
              <p className="text-text-primary font-medium mb-1">
                {search ? 'No matching tasks' : 'No tasks yet'}
              </p>
              <p className="text-text-muted text-sm">
                {search
                  ? 'Try a different search term'
                  : 'Head to Dashboard to create your first task'}
              </p>
            </div>
          </motion.div>
        )}

        {!isLoading && filteredTasks.length > 0 && (
          <div className="flex flex-col gap-3 pt-2 pb-4">
            <AnimatePresence>
              {filteredTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <TaskCard
                    task={task}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
