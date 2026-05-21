import React from 'react'
import { Network, Search, Code2, FileText, Brain } from 'lucide-react'
import type { AgentType, AgentState } from '../../types'

interface AgentAvatarProps {
  type: AgentType
  state?: AgentState
  size?: 'sm' | 'md' | 'lg'
  showBadge?: boolean
}

const agentConfig: Record<AgentType, { color: string; bg: string; Icon: React.ElementType; label: string }> = {
  orchestrator: { color: '#7C71F0', bg: '#7C71F020', Icon: Network, label: 'Orchestrator' },
  researcher: { color: '#4FC3F7', bg: '#4FC3F720', Icon: Search, label: 'Researcher' },
  coder: { color: '#4ECCA3', bg: '#4ECCA320', Icon: Code2, label: 'Coder' },
  writer: { color: '#D97757', bg: '#D9775720', Icon: FileText, label: 'Writer' },
  memory: { color: '#FFB74D', bg: '#FFB74D20', Icon: Brain, label: 'Memory' },
}

const sizeConfig = {
  sm: { outer: 'w-8 h-8', icon: 16, ring: 'ring-1', badge: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5' },
  md: { outer: 'w-10 h-10', icon: 20, ring: 'ring-2', badge: 'w-3 h-3 -bottom-0.5 -right-0.5' },
  lg: { outer: 'w-14 h-14', icon: 26, ring: 'ring-2', badge: 'w-4 h-4 -bottom-1 -right-1' },
}

const activeStates: AgentState[] = ['thinking', 'acting']

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  type,
  state = 'idle',
  size = 'md',
  showBadge = true,
}) => {
  const config = agentConfig[type]
  const sizes = sizeConfig[size]
  const isActive = activeStates.includes(state)

  return (
    <div className="relative flex-shrink-0">
      {/* Pulsing ring when active */}
      {isActive && (
        <div
          className={`absolute inset-0 rounded-full animate-pulse-glow`}
          style={{
            boxShadow: `0 0 12px ${config.color}66`,
            borderRadius: '50%',
          }}
        />
      )}
      <div
        className={`
          ${sizes.outer} rounded-full flex items-center justify-center
          ${isActive ? `${sizes.ring} ring-offset-1 ring-offset-surface` : ''}
          transition-all duration-300
        `}
        style={{
          backgroundColor: config.bg,
          ...(isActive ? { ringColor: config.color } : {}),
          border: isActive ? `2px solid ${config.color}80` : `1px solid ${config.color}30`,
        }}
      >
        <config.Icon
          size={sizes.icon}
          style={{ color: config.color }}
        />
      </div>

      {/* State badge dot */}
      {showBadge && (
        <div
          className={`
            absolute ${sizes.badge} rounded-full border-2 border-surface
            ${state === 'done' || state === 'completed' ? 'bg-success' : ''}
            ${state === 'error' ? 'bg-error' : ''}
            ${state === 'thinking' || state === 'acting' || state === 'running' ? 'bg-primary animate-pulse' : ''}
            ${state === 'waiting' ? 'bg-warning' : ''}
            ${state === 'idle' ? 'bg-text-muted' : ''}
          `}
        />
      )}
    </div>
  )
}
