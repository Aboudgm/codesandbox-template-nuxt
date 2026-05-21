import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, Search, Code2, FileText, Brain } from 'lucide-react'
import type { AgentInfo, AgentType } from '../../types'

interface AgentGraphProps {
  agents: AgentInfo[]
}

const agentConfig: Record<AgentType, {
  color: string
  label: string
  Icon: React.ElementType
}> = {
  orchestrator: { color: '#7C71F0', label: 'Orchestrator', Icon: Network },
  researcher: { color: '#4FC3F7', label: 'Researcher', Icon: Search },
  coder: { color: '#4ECCA3', label: 'Coder', Icon: Code2 },
  writer: { color: '#D97757', label: 'Writer', Icon: FileText },
  memory: { color: '#FFB74D', label: 'Memory', Icon: Brain },
}

// Default agents when none provided
const DEFAULT_AGENTS: AgentInfo[] = [
  { id: '1', name: 'Orchestrator', type: 'orchestrator', state: 'idle', messages_count: 0 },
  { id: '2', name: 'Researcher', type: 'researcher', state: 'idle', messages_count: 0 },
  { id: '3', name: 'Coder', type: 'coder', state: 'idle', messages_count: 0 },
  { id: '4', name: 'Writer', type: 'writer', state: 'idle', messages_count: 0 },
  { id: '5', name: 'Memory', type: 'memory', state: 'idle', messages_count: 0 },
]

interface NodePosition {
  x: number
  y: number
}

export const AgentGraph: React.FC<AgentGraphProps> = ({ agents }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 })
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)

  const displayAgents = agents.length > 0 ? agents : DEFAULT_AGENTS

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [])

  // Calculate node positions in a circular layout
  const getNodePositions = useCallback((): NodePosition[] => {
    const { width, height } = dimensions
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.34

    return displayAgents.map((_, i) => {
      const angle = (i / displayAgents.length) * Math.PI * 2 - Math.PI / 2
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      }
    })
  }, [dimensions, displayAgents])

  const nodePositions = getNodePositions()
  const orchestratorIndex = displayAgents.findIndex((a) => a.type === 'orchestrator')

  // Check if there's any active agent
  const hasActiveAgents = displayAgents.some(
    (a) => a.state === 'thinking' || a.state === 'acting'
  )

  const NODE_RADIUS = 24

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: '200px' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="absolute inset-0"
      >
        {/* Connection lines from orchestrator to others */}
        {orchestratorIndex >= 0 &&
          displayAgents.map((agent, i) => {
            if (i === orchestratorIndex) return null
            const from = nodePositions[orchestratorIndex]
            const to = nodePositions[i]
            if (!from || !to) return null
            const isActive =
              agent.state === 'thinking' || agent.state === 'acting' || hasActiveAgents

            return (
              <g key={`line-${agent.id}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isActive ? agentConfig[agent.type].color : '#2A2D4A'}
                  strokeWidth={isActive ? 1.5 : 0.8}
                  strokeOpacity={isActive ? 0.5 : 0.3}
                  strokeDasharray={isActive ? '4 4' : 'none'}
                  className={isActive ? 'animate-neural-pulse' : ''}
                />
                {/* Particle on active connections */}
                {isActive && (
                  <circle r="3" fill={agentConfig[agent.type].color} opacity="0.8">
                    <animateMotion
                      dur={`${2 + i * 0.4}s`}
                      repeatCount="indefinite"
                      path={`M ${from.x},${from.y} L ${to.x},${to.y}`}
                    />
                  </circle>
                )}
              </g>
            )
          })}
      </svg>

      {/* Agent nodes (HTML overlays for better rendering) */}
      {displayAgents.map((agent, i) => {
        const pos = nodePositions[i]
        if (!pos) return null
        const config = agentConfig[agent.type]
        const isActive = agent.state === 'thinking' || agent.state === 'acting'
        const isSelected = selectedAgent?.id === agent.id
        const { Icon } = config

        return (
          <motion.button
            key={agent.id}
            onClick={() => setSelectedAgent(isSelected ? null : agent)}
            className="absolute flex flex-col items-center gap-1"
            style={{
              left: pos.x - NODE_RADIUS,
              top: pos.y - NODE_RADIUS,
              width: NODE_RADIUS * 2,
              transform: 'none',
            }}
            whileTap={{ scale: 0.9 }}
          >
            {/* Node circle */}
            <motion.div
              animate={isActive ? {
                boxShadow: [
                  `0 0 8px ${config.color}40`,
                  `0 0 20px ${config.color}80`,
                  `0 0 8px ${config.color}40`,
                ],
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center justify-center rounded-full"
              style={{
                width: NODE_RADIUS * 2,
                height: NODE_RADIUS * 2,
                background: `radial-gradient(circle, ${config.color}30, ${config.color}10)`,
                border: `${isSelected ? 2 : 1.5}px solid ${config.color}${isActive ? 'CC' : '60'}`,
              }}
            >
              <Icon size={16} style={{ color: config.color }} />
            </motion.div>

            {/* Label */}
            <span
              className="text-[9px] font-medium text-center leading-tight"
              style={{
                color: isActive ? config.color : '#5A6080',
                maxWidth: '52px',
                wordBreak: 'break-word',
              }}
            >
              {config.label}
            </span>
          </motion.button>
        )
      })}

      {/* Selected agent overlay */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-0 left-4 right-4 rounded-xl p-3"
            style={{
              background: 'rgba(18,18,31,0.96)',
              border: `1px solid ${agentConfig[selectedAgent.type].color}40`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-primary">{selectedAgent.name}</p>
                <p
                  className="text-xs capitalize"
                  style={{ color: agentConfig[selectedAgent.type].color }}
                >
                  {selectedAgent.state}
                </p>
              </div>
              <div className="text-xs text-text-muted">
                {selectedAgent.messages_count} msgs
              </div>
            </div>
            {selectedAgent.current_task && (
              <p className="text-xs text-text-muted mt-1 line-clamp-1">
                {selectedAgent.current_task}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
