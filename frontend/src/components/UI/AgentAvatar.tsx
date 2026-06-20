import React from 'react'
import { Zap, Search, Code2, FileText, Brain } from 'lucide-react'
import type { AgentState } from '../../types'
import { getAgentColor } from '../../lib/stream'

interface AgentAvatarProps {
  type: string
  state?: AgentState
  size?: 'sm' | 'md' | 'lg'
  showBadge?: boolean
}

const agentCfg: Record<string, { Icon: React.ElementType }> = {
  STRATEGIST:   { Icon: Zap     },
  ORCHESTRATOR: { Icon: Zap     },
  RESEARCHER:   { Icon: Search  },
  CODER:        { Icon: Code2   },
  WRITER:       { Icon: FileText},
  MEMORY:       { Icon: Brain   },
}

const sizes = {
  sm: { w: 32,  icon: 14 },
  md: { w: 40,  icon: 18 },
  lg: { w: 56,  icon: 24 },
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  type, state = 'idle', size = 'md', showBadge = true,
}) => {
  const key    = type?.toUpperCase() ?? ''
  const color  = getAgentColor(key)
  const cfg    = agentCfg[key] ?? { Icon: Zap }
  const { w, icon } = sizes[size]
  const active = state === 'thinking' || state === 'acting'

  return (
    <div className="relative flex-shrink-0" style={{ width: w, height: w }}>
      {active && (
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 12px ${color}60`, animation: 'pulse 2s infinite' }}
        />
      )}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{
          background: `${color}18`,
          border: `${active ? 2 : 1}px solid ${color}${active ? '80' : '35'}`,
        }}
      >
        <cfg.Icon size={icon} style={{ color }} />
      </div>
      {showBadge && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
          style={{
            background: active ? color
                       : state === 'done'  ? '#00FFB3'
                       : state === 'error' ? '#FF5370'
                       : '#2A2A50',
            border: '2px solid #05050F',
          }}
        />
      )}
    </div>
  )
}
