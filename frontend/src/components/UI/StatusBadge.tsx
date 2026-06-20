import React from 'react'
import { motion } from 'framer-motion'
import type { TaskStatus, AgentState } from '../../types'

type BadgeStatus = TaskStatus | AgentState

const cfg: Record<BadgeStatus, { label: string; color: string; dot: string }> = {
  pending:   { label: 'Pending',   color: '#38BDF8', dot: '#38BDF8' },
  running:   { label: 'Running',   color: '#E87040', dot: '#E87040' },
  paused:    { label: 'Paused',    color: '#F5C518', dot: '#F5C518' },
  completed: { label: 'Done',      color: '#2DD4BF', dot: '#2DD4BF' },
  failed:    { label: 'Failed',    color: '#EF6060', dot: '#EF6060' },
  idle:      { label: 'Idle',      color: '#55556A', dot: '#55556A' },
  thinking:  { label: 'Thinking',  color: '#9B8CE8', dot: '#9B8CE8' },
  acting:    { label: 'Acting',    color: '#E87040', dot: '#E87040' },
  waiting:   { label: 'Waiting',   color: '#F5C518', dot: '#F5C518' },
  done:      { label: 'Done',      color: '#2DD4BF', dot: '#2DD4BF' },
  error:     { label: 'Error',     color: '#EF6060', dot: '#EF6060' },
}

const PULSE = new Set<BadgeStatus>(['running', 'thinking', 'acting', 'pending'])

export const StatusBadge: React.FC<{ status: BadgeStatus; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const c = cfg[status] ?? cfg.idle
  const pulse = PULSE.has(status)
  const sz = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sz}`}
      style={{ background: `${c.color}12`, border: `1px solid ${c.color}30`, color: c.color }}
    >
      {pulse ? (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: c.dot }}
        />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      )}
      {c.label}
    </span>
  )
}
