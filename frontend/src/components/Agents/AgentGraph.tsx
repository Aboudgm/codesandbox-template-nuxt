import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Search, Code2, FileText, Brain } from 'lucide-react'
import type { AgentInfo, AgentType } from '../../types'
import { getAgentColor } from '../../lib/stream'

interface AgentGraphProps {
  agents: AgentInfo[]
}

const agentConfig: Partial<Record<string, { color: string; label: string; Icon: React.ElementType }>> = {
  STRATEGIST:   { color: '#D97757', label: 'NEXUS',  Icon: Zap      },
  ORCHESTRATOR: { color: '#D97757', label: 'NEXUS',  Icon: Zap      },
  RESEARCHER:   { color: '#00E5FF', label: 'ARIA',   Icon: Search   },
  CODER:        { color: '#00FFB3', label: 'FORGE',  Icon: Code2    },
  WRITER:       { color: '#C084FC', label: 'SCRIBE', Icon: FileText },
  MEMORY:       { color: '#FFB74D', label: 'ECHO',   Icon: Brain    },
}

const DEFAULT_AGENTS: AgentInfo[] = [
  { id: '1', name: 'NEXUS',  type: 'STRATEGIST', state: 'idle', messages_count: 0 },
  { id: '2', name: 'ARIA',   type: 'RESEARCHER', state: 'idle', messages_count: 0 },
  { id: '3', name: 'FORGE',  type: 'CODER',      state: 'idle', messages_count: 0 },
  { id: '4', name: 'SCRIBE', type: 'WRITER',     state: 'idle', messages_count: 0 },
  { id: '5', name: 'ECHO',   type: 'MEMORY',     state: 'idle', messages_count: 0 },
]

interface NodePos { x: number; y: number }

export const AgentGraph: React.FC<AgentGraphProps> = ({ agents }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 300, height: 200 })
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)

  const displayAgents = agents.length > 0 ? agents : DEFAULT_AGENTS

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e) setDims({ width: e.contentRect.width, height: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const getPositions = useCallback((): NodePos[] => {
    const { width, height } = dims
    const cx = width / 2, cy = height / 2
    const r = Math.min(width, height) * 0.34
    return displayAgents.map((_, i) => {
      const a = (i / displayAgents.length) * Math.PI * 2 - Math.PI / 2
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
    })
  }, [dims, displayAgents])

  const positions = getPositions()
  const orchIdx   = displayAgents.findIndex((a) => a.type === 'STRATEGIST' || a.type === 'ORCHESTRATOR')
  const NR = 24

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: 200 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${dims.width} ${dims.height}`} className="absolute inset-0">
        {orchIdx >= 0 && displayAgents.map((agent, i) => {
          if (i === orchIdx) return null
          const from = positions[orchIdx], to = positions[i]
          if (!from || !to) return null
          const active = agent.state === 'thinking' || agent.state === 'acting'
          const color = agentConfig[agent.type]?.color ?? '#4A4A70'
          return (
            <g key={`line-${agent.id}`}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={active ? color : '#1E2040'}
                strokeWidth={active ? 1.5 : 0.8}
                strokeOpacity={active ? 0.6 : 0.4}
                strokeDasharray={active ? '4 4' : 'none'}
              />
              {active && (
                <circle r="2.5" fill={color} opacity="0.9">
                  <animateMotion dur={`${2 + i * 0.4}s`} repeatCount="indefinite"
                    path={`M ${from.x},${from.y} L ${to.x},${to.y}`} />
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      {displayAgents.map((agent, i) => {
        const pos = positions[i]
        if (!pos) return null
        const cfg = agentConfig[agent.type] ?? { color: '#4A4A70', label: agent.name, Icon: Zap }
        const active = agent.state === 'thinking' || agent.state === 'acting'
        const selected = selectedAgent?.id === agent.id
        const { Icon, color, label } = cfg

        return (
          <motion.button
            key={agent.id}
            onClick={() => setSelectedAgent(selected ? null : agent)}
            className="absolute flex flex-col items-center gap-1"
            style={{ left: pos.x - NR, top: pos.y - NR, width: NR * 2 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={active ? { boxShadow: [`0 0 8px ${color}40`, `0 0 20px ${color}80`, `0 0 8px ${color}40`] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center justify-center rounded-full"
              style={{
                width: NR * 2, height: NR * 2,
                background: `radial-gradient(circle, ${color}28, ${color}08)`,
                border: `${selected ? 2 : 1.5}px solid ${color}${active ? 'CC' : '50'}`,
              }}
            >
              <Icon size={16} style={{ color }} />
            </motion.div>
            <span className="text-[9px] font-bold text-center" style={{ color: active ? color : '#2A2A50', maxWidth: 52 }}>
              {label}
            </span>
          </motion.button>
        )
      })}

      <AnimatePresence>
        {selectedAgent && (() => {
          const cfg = agentConfig[selectedAgent.type] ?? { color: '#4A4A70' }
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-0 left-4 right-4 rounded-xl p-3"
              style={{
                background: 'rgba(10,10,26,0.97)',
                border: `1px solid ${cfg.color}35`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold" style={{ color: '#E8E8F8' }}>{selectedAgent.name}</p>
                  <p className="text-xs capitalize" style={{ color: cfg.color }}>{selectedAgent.state}</p>
                </div>
                <span className="text-[10px]" style={{ color: '#4A4A70' }}>{selectedAgent.messages_count} msgs</span>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
