import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronRight, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../UI/StatusBadge'
import type { Task } from '../../types'

function timeAgo(dateStr: string): string {
  try {
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (secs < 60)    return `${secs}s ago`
    if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
    return `${Math.floor(secs / 86400)}d ago`
  } catch { return 'just now' }
}

const STATUS_COLORS: Record<string, string> = {
  running:   '#D97757',
  completed: '#00FFB3',
  failed:    '#FF5370',
  pending:   '#00E5FF',
  paused:    '#FFB74D',
}

interface TaskCardProps {
  task: Task
  onDelete?: (id: string) => void
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDelete }) => {
  const navigate = useNavigate()
  const accent = STATUS_COLORS[task.status] ?? '#38384A'

  return (
    <motion.div
      whileTap={{ scale: 0.982 }}
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="relative cursor-pointer rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(12,10,20,0.85)',
        border: task.status === 'running'
          ? '1px solid rgba(217,119,87,0.22)'
          : '1px solid rgba(50,46,68,0.6)',
      }}
    >
      {/* Running shimmer */}
      {task.status === 'running' && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden"
          style={{ background: 'rgba(217,119,87,0.06)' }}
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent, #D97757, transparent)' }}
          />
        </div>
      )}

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
        style={{ background: `${accent}55` }}
      />

      <div className="px-4 py-3.5 pl-5">
        <p
          className="text-sm font-medium leading-snug mb-2.5 line-clamp-2"
          style={{ color: '#C8C8D8' }}
        >
          {task.goal}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} size="sm" />
            <div className="flex items-center gap-1" style={{ color: '#2A2A3A' }}>
              <Clock size={10} />
              <span className="text-[10px]">{timeAgo(task.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(255,83,112,0.07)',
                  border: '1px solid rgba(255,83,112,0.14)',
                }}
                aria-label="Delete task"
              >
                <Trash2 size={11} style={{ color: '#FF5370' }} />
              </motion.button>
            )}
            <ChevronRight size={14} style={{ color: '#2A2A3A' }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
