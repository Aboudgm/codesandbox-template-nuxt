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
  running:   '#E87040',
  completed: '#2DD4BF',
  failed:    '#EF6060',
  pending:   '#38BDF8',
  paused:    '#F5C518',
}

interface TaskCardProps {
  task: Task
  onDelete?: (id: string) => void
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDelete }) => {
  const navigate = useNavigate()
  const accent = STATUS_COLORS[task.status] ?? '#55556A'

  return (
    <motion.div
      whileTap={{ scale: 0.982 }}
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="relative cursor-pointer rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(22,22,30,0.92)',
        border: task.status === 'running'
          ? '1px solid rgba(232,112,64,0.20)'
          : '1px solid rgba(255,255,255,0.055)',
        boxShadow: task.status === 'running'
          ? '0 0 20px rgba(232,112,64,0.08)'
          : 'none',
      }}
    >
      {/* Running shimmer */}
      {task.status === 'running' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent, #E87040, transparent)' }}
          />
        </div>
      )}

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
        style={{ background: `${accent}44` }}
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
            <div className="flex items-center gap-1" style={{ color: '#33333C' }}>
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
                  background: 'rgba(239,96,96,0.07)',
                  border: '1px solid rgba(239,96,96,0.14)',
                }}
                aria-label="Delete task"
              >
                <Trash2 size={11} style={{ color: '#EF6060' }} />
              </motion.button>
            )}
            <ChevronRight size={14} style={{ color: '#33333C' }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
