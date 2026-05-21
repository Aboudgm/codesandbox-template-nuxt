import React from 'react'
import type { TaskStatus, AgentState } from '../../types'

type BadgeStatus = TaskStatus | AgentState

interface StatusBadgeProps {
  status: BadgeStatus
  size?: 'sm' | 'md'
}

const statusConfig: Record<BadgeStatus, { label: string; color: string; bg: string; pulse?: boolean }> = {
  // Task statuses
  pending: { label: 'Pending', color: 'text-text-muted', bg: 'bg-text-muted/10' },
  running: { label: 'Running', color: 'text-primary', bg: 'bg-primary/10', pulse: true },
  paused: { label: 'Paused', color: 'text-warning', bg: 'bg-warning/10' },
  completed: { label: 'Done', color: 'text-success', bg: 'bg-success/10' },
  failed: { label: 'Failed', color: 'text-error', bg: 'bg-error/10' },
  // Agent states
  idle: { label: 'Idle', color: 'text-text-muted', bg: 'bg-text-muted/10' },
  thinking: { label: 'Thinking', color: 'text-secondary', bg: 'bg-secondary/10', pulse: true },
  acting: { label: 'Acting', color: 'text-primary', bg: 'bg-primary/10', pulse: true },
  waiting: { label: 'Waiting', color: 'text-warning', bg: 'bg-warning/10' },
  done: { label: 'Done', color: 'text-success', bg: 'bg-success/10' },
  error: { label: 'Error', color: 'text-error', bg: 'bg-error/10' },
}

const dotColors: Record<BadgeStatus, string> = {
  pending: 'bg-text-muted',
  running: 'bg-primary',
  paused: 'bg-warning',
  completed: 'bg-success',
  failed: 'bg-error',
  idle: 'bg-text-muted',
  thinking: 'bg-secondary',
  acting: 'bg-primary',
  waiting: 'bg-warning',
  done: 'bg-success',
  error: 'bg-error',
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status] ?? statusConfig.idle
  const dotColor = dotColors[status] ?? 'bg-text-muted'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${config.color} ${config.bg}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
      `}
    >
      <span
        className={`
          rounded-full flex-shrink-0
          ${dotColor}
          ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}
          ${config.pulse ? 'animate-pulse' : ''}
        `}
      />
      {config.label}
    </span>
  )
}
