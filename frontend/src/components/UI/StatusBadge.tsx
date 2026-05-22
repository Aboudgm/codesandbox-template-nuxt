import React from 'react'
import { motion } from 'framer-motion'
import type { TaskStatus, AgentState } from '../../types'

type BadgeStatus = TaskStatus | AgentState

const cfg: Record<BadgeStatus, { label: string; color: string; dot: string }> = {
  pending:   { label: 'Pending',   color: '#00E5FF', dot: '#00E5FF' },
  running:   { label: 'Running',   color: '#D97757', dot: '#D97757' },
  paused:    { label: 'Paused',    color: '#FFB74D', dot: '#FFB74D' },
  completed: { label: 'Done',      color: '#00FFB3', dot: '#00FFB3' },
  failed:    { label: 'Failed',    color: '#FF5370', dot: '#FF5370' },
  idle:      { label: 'Idle',      color: '#4A4A70', dot: '#4A4A70' },
  thinking:  { label: 'Thinking',  color: '#7C71F0', dot: '#7C71F0' },
  acting:    { label: 'Acting',    color: '#D97757', dot: '#D97757' },
  waiting:   { label: 'Waiting',   color: '#FFB74D', dot: '#FFB74D' },
  done:      { label: 'Done',      color: '#00FFB3', dot: '#00FFB3' },
  error:     { label: 'Error',     color: '#FF5370', dot: '#FF5370' },
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
