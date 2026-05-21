import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Trash2, Users, ChevronRight } from 'lucide-react'
import { motion, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion'
import { StatusBadge } from '../UI/StatusBadge'
import type { Task } from '../../types'

interface TaskCardProps {
  task: Task
  onDelete?: (id: string) => void
}

const SWIPE_THRESHOLD = 80

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDelete }) => {
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)
  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD], [1, 0.5])
  const cardOpacity = useTransform(x, [-200, -80, 0], [0.5, 0.8, 1])
  const deleteX = useTransform(x, [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, 0], [-10, 0, 20])
  const constraintsRef = useRef(null)

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(task.created_at), { addSuffix: true })
    } catch {
      return 'just now'
    }
  })()

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setShowDelete(true)
      animate(x, -SWIPE_THRESHOLD * 1.2, { type: 'spring', stiffness: 300, damping: 30 })
    } else {
      setShowDelete(false)
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      animate(x, -400, { duration: 0.25 })
      setTimeout(() => onDelete(task.id), 250)
    }
  }

  const handleCardClick = () => {
    if (showDelete) {
      setShowDelete(false)
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    } else {
      navigate(`/tasks/${task.id}`)
    }
  }

  const isRunning = task.status === 'running'

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-2xl">
      {/* Delete background */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-5 rounded-2xl"
        style={{ background: 'rgba(239,83,80,0.15)', border: '1px solid rgba(239,83,80,0.3)' }}
      >
        <motion.div
          style={{ opacity: deleteOpacity, x: deleteX }}
          className="flex flex-col items-center gap-1"
        >
          <Trash2 size={20} className="text-error" />
          <span className="text-xs text-error font-medium">Delete</span>
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        style={{ x, opacity: cardOpacity, background: 'rgba(26,26,46,0.85)', border: '1px solid rgba(42,45,74,0.6)' }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        className="relative cursor-pointer rounded-2xl overflow-hidden backdrop-blur-md"
        whileTap={{ scale: 0.99 }}
      >
        {/* Running progress bar */}
        {isRunning && (
          <div
            className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden"
            style={{ background: 'rgba(217,119,87,0.1)' }}
          >
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full w-1/3 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, #D97757, transparent)' }}
            />
          </div>
        )}

        <div className="p-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-text-primary leading-snug flex-1 line-clamp-2">
              {task.goal}
            </p>
            <ChevronRight size={16} className="text-text-muted flex-shrink-0 mt-0.5" />
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge status={task.status} size="sm" />

              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Users size={11} />
                <span>{task.agents.length || task.messages.length > 0 ? task.agents.length || 1 : 0} agents</span>
              </div>
            </div>

            <span className="text-xs text-text-muted">{timeAgo}</span>
          </div>
        </div>
      </motion.div>

      {/* Confirm delete button (when swiped) */}
      {showDelete && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleDelete}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(239,83,80,0.2)', border: '1px solid rgba(239,83,80,0.4)' }}
        >
          <Trash2 size={14} className="text-error" />
          <span className="text-xs text-error font-medium">Delete</span>
        </motion.button>
      )}
    </div>
  )
}
