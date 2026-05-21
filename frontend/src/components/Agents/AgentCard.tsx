import React from 'react'
import { MessageSquare, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassCard } from '../UI/GlassCard'
import { AgentAvatar } from '../UI/AgentAvatar'
import { StatusBadge } from '../UI/StatusBadge'
import type { AgentInfo } from '../../types'

interface AgentCardProps {
  agent: AgentInfo
}

const agentColors: Record<string, string> = {
  orchestrator: '#7C71F0',
  researcher: '#4FC3F7',
  coder: '#4ECCA3',
  writer: '#D97757',
  memory: '#FFB74D',
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const color = agentColors[agent.type] ?? '#9096B8'
  const isActive = agent.state === 'thinking' || agent.state === 'acting'
  const activityLevel = Math.min((agent.messages_count / 50) * 100, 100)

  return (
    <GlassCard
      glow={isActive ? color : undefined}
      padding={false}
      className="overflow-hidden"
    >
      {/* Top accent line */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <AgentAvatar type={agent.type} state={agent.state} size="md" />
            <div>
              <h4 className="text-sm font-semibold text-text-primary">{agent.name}</h4>
              <p className="text-xs text-text-muted capitalize">{agent.type}</p>
            </div>
          </div>
          <StatusBadge status={agent.state} size="sm" />
        </div>

        {/* Current activity */}
        {agent.current_task && (
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2 mb-3"
            style={{ background: `${color}10` }}
          >
            <Zap size={12} className="flex-shrink-0 mt-0.5" style={{ color }} />
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
              {agent.current_task}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <MessageSquare size={12} />
            <span>{agent.messages_count} messages</span>
          </div>
          {isActive && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-xs font-medium"
              style={{ color }}
            >
              Active
            </motion.div>
          )}
        </div>

        {/* Activity bar */}
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(42,45,74,0.5)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activityLevel}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
          />
        </div>
      </div>
    </GlassCard>
  )
}
