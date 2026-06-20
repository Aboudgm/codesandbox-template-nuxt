import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { AgentInfo } from '../../types'
import { getAgentColor, getAgentIcon, getAgentName, getAgentTagline } from '../../lib/stream'

interface AgentOrbProps {
  agent: AgentInfo
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export const AgentOrb: React.FC<AgentOrbProps> = ({ agent, size = 'md', showLabel = true }) => {
  const [hovered, setHovered] = useState(false)
  const color   = getAgentColor(agent.type)
  const icon    = getAgentIcon(agent.type)
  const name    = getAgentName(agent.type) || agent.name
  const tagline = getAgentTagline(agent.type)

  const isActive = agent.state === 'thinking' || agent.state === 'acting'
  const isDone   = agent.state === 'done'
  const isError  = agent.state === 'error'
  const isIdle   = !isActive && !isDone && !isError

  const dims     = { sm: 40, md: 52, lg: 64 }[size]
  const fontSize = { sm: '1rem', md: '1.25rem', lg: '1.55rem' }[size]
  const ringSize = dims + 14

  return (
    <div
      className="flex flex-col items-center gap-2 relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute bottom-full mb-3 z-50 pointer-events-none"
          style={{ minWidth: 140 }}
        >
          <div
            className="rounded-xl px-3 py-2 text-center"
            style={{
              background: 'rgba(22,22,30,0.98)',
              border: `1px solid ${color}30`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 12px ${color}20`,
            }}
          >
            <p className="text-[10px] font-bold tracking-widest" style={{ color }}>{name}</p>
            {tagline && (
              <p className="text-[9px] mt-0.5 leading-snug" style={{ color: '#55556A' }}>{tagline}</p>
            )}
            {(agent.messages_count ?? 0) > 0 && (
              <p className="text-[9px] mt-1" style={{ color: '#55556A' }}>
                {agent.messages_count} messages
              </p>
            )}
          </div>
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid ${color}30`,
            }}
          />
        </motion.div>
      )}

      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        {/* Idle breathing glow */}
        {isIdle && (
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full"
            style={{
              inset: -4,
              background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Active pulsing halo */}
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full"
            style={{ background: `${color}28`, border: `1px solid ${color}50` }}
          />
        )}

        {/* Rotating outer ring — active only */}
        {isActive && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute rounded-full"
            style={{
              inset: 2,
              border: `1.5px dashed ${color}45`,
            }}
          />
        )}

        {/* Static outer ring — idle/done */}
        {!isActive && (
          <div
            className="absolute rounded-full"
            style={{
              inset: 2,
              border: `1px solid ${isDone ? '#2DD4BF30' : isError ? '#EF606030' : `${color}18`}`,
            }}
          />
        )}

        {/* Core orb */}
        <motion.div
          animate={
            isActive
              ? { boxShadow: [`0 0 12px ${color}40`, `0 0 28px ${color}70`, `0 0 12px ${color}40`] }
              : isIdle
              ? { boxShadow: [`0 0 6px ${color}20`, `0 0 14px ${color}35`, `0 0 6px ${color}20`] }
              : {}
          }
          transition={isActive ? { duration: 1.4, repeat: Infinity } : { duration: 3, repeat: Infinity }}
          className="absolute rounded-full flex items-center justify-center scanlines overflow-hidden"
          style={{
            inset: 8,
            background: isError
              ? `radial-gradient(circle at 35% 35%, rgba(239,96,96,0.3), rgba(8,8,12,0.97))`
              : isDone
              ? `radial-gradient(circle at 35% 35%, rgba(45,212,191,0.25), rgba(8,8,12,0.97))`
              : `radial-gradient(circle at 35% 35%, ${color}28, rgba(8,8,12,0.97))`,
            border: `1px solid ${isError ? '#EF606055' : isDone ? '#2DD4BF55' : `${color}${isActive ? '70' : '35'}`}`,
          }}
        >
          <span style={{ fontSize, lineHeight: 1 }}>{icon}</span>
        </motion.div>

        {/* State indicator dot */}
        <div
          className="absolute bottom-1 right-1 rounded-full"
          style={{
            width: 9,
            height: 9,
            background: isError  ? '#EF6060'
                       : isActive ? color
                       : isDone   ? '#2DD4BF'
                       : '#1D1D26',
            border: '2px solid #08080C',
            boxShadow: isActive ? `0 0 6px ${color}` : isDone ? '0 0 5px #2DD4BF80' : 'none',
          }}
        />
      </div>

      {showLabel && (
        <div className="text-center" style={{ minWidth: 48 }}>
          <p
            className="text-[10px] font-bold tracking-widest transition-colors"
            style={{ color: isActive ? color : isError ? '#EF6060' : isDone ? '#2DD4BF' : '#55556A' }}
          >
            {name}
          </p>
          <p className="text-[9px] capitalize" style={{ color: isActive ? `${color}80` : '#33333C' }}>
            {agent.state ?? 'idle'}
          </p>
        </div>
      )}
    </div>
  )
}
