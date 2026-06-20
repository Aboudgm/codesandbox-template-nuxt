/**
 * StreamOutput — renders a list of StreamEvents with rich visual differentiation
 * per event type. Designed to read like a story of agents collaborating.
 */
import React, { memo, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import type { StreamEvent, Plan } from '../../types'
import { getAgentColor, getAgentIcon, getAgentName } from '../../lib/stream'

interface StreamOutputProps {
  events: (StreamEvent | { type: string; content: string; agent_type?: string; agent_name?: string; timestamp?: string; metadata?: Record<string, unknown> })[]
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return { copied, copy }
}

// ── ThinkingEvent ─────────────────────────────────────────────────────────────

const ThinkingEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => {
  const color = getAgentColor(event.agent_type ?? '')
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2.5 py-1.5 pl-3"
      style={{ borderLeft: `2px solid ${color}30` }}
    >
      <span className="text-[11px] mt-0.5 shrink-0 font-mono" style={{ color: `${color}70` }}>◆</span>
      <p className="text-xs italic leading-relaxed" style={{ color: '#55556A' }}>
        {event.content}
      </p>
    </motion.div>
  )
}

// ── ToolCallEvent ─────────────────────────────────────────────────────────────

const ToolCallEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => {
  const tool = (event.metadata as Record<string, string>)?.tool ?? 'tool'
  const { copied, copy } = useCopy(event.content)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-1.5 rounded-xl overflow-hidden"
      style={{
        border: '1px solid rgba(56,189,248,0.15)',
        background: 'rgba(8,8,12,0.85)',
      }}
    >
      {/* Terminal header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: '1px solid rgba(56,189,248,0.1)',
          background: 'rgba(56,189,248,0.05)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono" style={{ color: '#38BDF8' }}>⚙ {tool}</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
            style={{ background: 'rgba(56,189,248,0.08)', color: '#38BDF870', border: '1px solid rgba(56,189,248,0.12)' }}
          >
            tool call
          </span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] transition-all"
          style={{
            background: copied ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.04)',
            color: copied ? '#2DD4BF' : '#55556A',
          }}
          title="Copy"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="px-3 py-2.5 text-[11px] overflow-x-auto no-scrollbar leading-relaxed"
        style={{ color: '#8A8A9A', fontFamily: 'JetBrains Mono, Consolas, monospace', margin: 0 }}
      >
        {event.content}
      </pre>
    </motion.div>
  )
}

// ── ToolResultEvent ───────────────────────────────────────────────────────────

const ToolResultEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 220
  const long = event.content.length > LIMIT

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 py-1.5 pl-6"
    >
      <span className="text-xs shrink-0 mt-0.5 font-mono" style={{ color: '#2DD4BF60' }}>└</span>
      <div>
        <p className="text-xs leading-relaxed" style={{ color: '#2DD4BF90' }}>
          {long && !expanded ? event.content.slice(0, LIMIT) + '…' : event.content}
        </p>
        {long && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 mt-1 text-[10px] font-medium"
            style={{ color: '#2DD4BF70' }}
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── PlanEvent ─────────────────────────────────────────────────────────────────

const PlanEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => {
  let plan: Plan | null = null
  try { plan = JSON.parse(event.content) } catch { return null }
  if (!plan) return null

  const complexityColor: Record<string, string> = {
    low: '#2DD4BF', medium: '#F5C518', high: '#EF6060',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-2 rounded-2xl overflow-hidden"
      style={{
        border: '1px solid rgba(232,112,64,0.22)',
        background: 'rgba(8,8,12,0.92)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          borderBottom: '1px solid rgba(232,112,64,0.12)',
          background: 'rgba(232,112,64,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: '#E87040' }}>⚡</span>
          <span className="text-xs font-bold tracking-wide" style={{ color: '#E87040' }}>Mission Plan</span>
        </div>
        {plan.complexity && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{
              color: complexityColor[plan.complexity] ?? '#8A8A9A',
              background: `${complexityColor[plan.complexity] ?? '#8A8A9A'}14`,
              border: `1px solid ${complexityColor[plan.complexity] ?? '#8A8A9A'}28`,
            }}
          >
            {plan.complexity.toUpperCase()} COMPLEXITY
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        {plan.summary && (
          <p className="text-xs mb-3 leading-relaxed" style={{ color: '#55556A' }}>{plan.summary}</p>
        )}

        <div className="flex flex-col gap-2">
          {plan.steps?.map((step, i) => {
            const agentColor = getAgentColor(step.agent?.toUpperCase())
            return (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="text-[9px] font-bold mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: `${agentColor}15`, color: agentColor }}
                >
                  {i + 1}
                </span>
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest mr-1.5"
                    style={{ color: agentColor }}
                  >
                    {getAgentName(step.agent?.toUpperCase() ?? '')}
                  </span>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#55556A' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ── StatusEvent ───────────────────────────────────────────────────────────────

const StatusEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center gap-2 py-0.5"
  >
    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#2DD4BF' }} />
    <p className="text-xs font-medium" style={{ color: '#2DD4BF90' }}>{event.content}</p>
  </motion.div>
)

// ── AgentMarkerEvent ──────────────────────────────────────────────────────────

const AgentMarkerEvent: React.FC<{ event: StreamOutputProps['events'][0]; done?: boolean }> = ({ event, done }) => {
  const color = getAgentColor(event.agent_type ?? '')
  const icon  = getAgentIcon(event.agent_type ?? '')
  const name  = getAgentName(event.agent_type ?? '') || event.agent_name || event.agent_type

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 my-2"
    >
      <div className="flex-1 h-px" style={{ background: `${color}18` }} />
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          background: `${color}0A`,
          border: `1px solid ${color}22`,
        }}
      >
        <span className="text-[10px]">{icon}</span>
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color }}>
          {name}
        </span>
        {done && <span className="text-[9px]" style={{ color: '#2DD4BF' }}>✓</span>}
      </div>
      <div className="flex-1 h-px" style={{ background: `${color}18` }} />
    </motion.div>
  )
}

// ── OutputEvent ───────────────────────────────────────────────────────────────

const OutputEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => {
  const color = getAgentColor(event.agent_type ?? '')
  const icon  = getAgentIcon(event.agent_type ?? '')
  const name  = getAgentName(event.agent_type ?? '') || event.agent_name || event.agent_type || 'NEXUS'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 flex gap-3"
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5"
        style={{
          background: `${color}14`,
          border: `1px solid ${color}30`,
        }}
      >
        {icon}
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color }}>
            {name}
          </span>
          {event.timestamp && (
            <span className="text-[9px]" style={{ color: '#33333C' }}>
              {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <div
          className="rounded-xl px-3.5 py-3 text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
          style={{
            background: 'rgba(13,13,18,0.95)',
            border: `1px solid ${color}18`,
            color: '#C8C8D8',
          }}
        >
          <ReactMarkdown>{event.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  )
}

// ── ErrorEvent ────────────────────────────────────────────────────────────────

const ErrorEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => (
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    className="my-2 rounded-xl overflow-hidden"
    style={{
      background: 'rgba(239,96,96,0.06)',
      border: '1px solid rgba(239,96,96,0.22)',
    }}
  >
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle size={13} style={{ color: '#EF6060' }} />
        <span className="text-xs font-bold" style={{ color: '#EF6060' }}>Error</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#EF606090' }}>{event.content}</p>
      <p className="text-[10px] mt-2" style={{ color: '#55556A' }}>
        Check Settings to verify API keys and backend connectivity.
      </p>
    </div>
  </motion.div>
)

// ── StreamOutput ──────────────────────────────────────────────────────────────

export const StreamOutput = memo<StreamOutputProps>(({ events }) => {
  return (
    <div className="flex flex-col gap-0.5">
      {events.map((event, i) => {
        const key = `${event.type}-${i}`
        switch (event.type) {
          case 'thinking':    return <ThinkingEvent    key={key} event={event} />
          case 'tool_call':   return <ToolCallEvent    key={key} event={event} />
          case 'tool_result': return <ToolResultEvent  key={key} event={event} />
          case 'plan':        return <PlanEvent        key={key} event={event} />
          case 'status':      return <StatusEvent      key={key} event={event} />
          case 'agent_start': return <AgentMarkerEvent key={key} event={event} />
          case 'agent_done':  return <AgentMarkerEvent key={key} event={event} done />
          case 'output':      return <OutputEvent      key={key} event={event} />
          case 'error':       return <ErrorEvent       key={key} event={event} />
          default:            return null
        }
      })}
    </div>
  )
})

StreamOutput.displayName = 'StreamOutput'
