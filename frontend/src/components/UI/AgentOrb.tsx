import React from 'react'
import { motion } from 'framer-motion'
import type { AgentInfo } from '../../types'
import { getAgentColor, getAgentIcon } from '../../lib/stream'

interface AgentOrbProps {
  agent: AgentInfo
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const AGENT_NAMES: Record<string, string> = {
  STRATEGIST:   'NEXUS',
  ORCHESTRATOR: 'NEXUS',
  RESEARCHER:   'ARIA',
  CODER:        'FORGE',
  WRITER:       'SCRIBE',
  MEMORY:       'ECHO',
}

export const AgentOrb: React.FC<AgentOrbProps> = ({ agent, size = 'md', showLabel = true }) => {
  const color = getAgentColor(agent.type)
  const icon = getAgentIcon(agent.type)
  const isActive = agent.state === 'thinking' || agent.state === 'acting'
  const isDone   = agent.state === 'done'
  const isError  = agent.state === 'error'

  const dims = { sm: 40, md: 52, lg: 64 }[size]
  const fontSize = { sm: '1rem', md: '1.3rem', lg: '1.6rem' }[size]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: dims, height: dims }}>
        {/* Outer ring — pulses when active */}
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full"
            style={{ background: `${color}30`, border: `1px solid ${color}60` }}
          />
        )}

        {/* Mid ring */}
        <motion.div
          animate={isActive ? { rotate: 360 } : {}}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[3px] rounded-full"
          style={{
            border: `1.5px solid ${color}${isActive ? '80' : '25'}`,
            borderTopColor: isActive ? color : 'transparent',
          }}
        />

        {/* Core orb */}
        <div
          className="absolute inset-[7px] rounded-full flex items-center justify-center scanlines overflow-hidden"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${color}25, rgba(5,5,15,0.95))`,
            border: `1px solid ${color}${isActive ? '60' : '30'}`,
            boxShadow: isActive ? `0 0 16px ${color}40, inset 0 0 12px ${color}10` : 'none',
          }}
        >
          <span style={{ fontSize, lineHeight: 1, filter: isDone ? 'grayscale(0.3)' : 'none' }}>
            {icon}
          </span>
        </div>

        {/* State dot */}
        <div
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
          style={{
            background: isError  ? '#FF5370'
                       : isActive ? color
                       : isDone   ? '#00FFB3'
                       : '#1E2040',
            border: '2px solid #05050F',
            boxShadow: isActive ? `0 0 8px ${color}` : 'none',
          }}
        />
      </div>

      {showLabel && (
        <div className="text-center">
          <p
            className="text-[10px] font-bold tracking-widest"
            style={{ color: isActive ? color : '#4A4A70' }}
          >
            {AGENT_NAMES[agent.type?.toUpperCase() ?? ''] ?? agent.name}
          </p>
          <p className="text-[9px]" style={{ color: '#2A2A50' }}>
            {agent.state}
          </p>
        </div>
      )}
    </div>
  )
}
