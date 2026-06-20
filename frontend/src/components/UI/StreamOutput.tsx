import React, { memo } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import type { StreamEvent, Plan } from '../../types'
import { getAgentColor, getAgentIcon } from '../../lib/stream'

interface StreamOutputProps {
  events: (StreamEvent | { type: string; content: string; agent_type?: string; agent_name?: string; timestamp?: string; metadata?: Record<string, unknown> })[]
}

const ThinkingEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => (
  <motion.div
    initial={{ opacity: 0, x: -6 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-start gap-2 py-1"
  >
    <span className="text-[10px] mt-0.5 w-3 shrink-0" style={{ color: '#55556A' }}>◆</span>
    <p className="text-xs italic leading-relaxed" style={{ color: '#55556A' }}>
      {event.content}
    </p>
  </motion.div>
)

const ToolCallEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => {
  const tool = (event.metadata as Record<string, string>)?.tool ?? 'tool'
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-1.5"
    >
      <div
        className="rounded-xl overflow-hidden font-mono"
        style={{ border: '1px solid rgba(45,212,191,0.18)', background: 'rgba(45,212,191,0.04)' }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{ borderBottom: '1px solid rgba(45,212,191,0.10)', background: 'rgba(45,212,191,0.08)' }}
        >
          <span className="text-[10px] font-bold" style={{ color: '#2DD4BF' }}>⚙ {tool}</span>
          <span className="text-[9px]" style={{ color: '#55556A' }}>tool call</span>
        </div>
        <pre
          className="px-3 py-2 text-[11px] overflow-x-auto no-scrollbar leading-relaxed"
          style={{ color: '#8A8A9A', margin: 0 }}
        >
          {event.content}
        </pre>
      </div>
    </motion.div>
  )
}

const ToolResultEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => (
  <motion.div
    initial={{ opacity: 0, x: 6 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-start gap-2 py-1 pl-4"
  >
    <span className="text-[10px] mt-0.5 shrink-0" style={{ color: '#4ADE80' }}>└</span>
    <p className="text-xs leading-relaxed" style={{ color: '#55556A' }}>
      {event.content.slice(0, 240)}{event.content.length > 240 ? '…' : ''}
    </p>
  </motion.div>
)

const PlanEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => {
  let plan: Plan | null = null
  try { plan = JSON.parse(event.content) } catch { return null }
  if (!plan) return null

  const complexityColor: Record<string, string> = { low: '#4ADE80', medium: '#F5C518', high: '#EF6060' }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-2 rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(232,112,64,0.22)', background: 'rgba(232,112,64,0.04)' }}
    >
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(232,112,64,0.12)', background: 'rgba(232,112,64,0.07)' }}
      >
        <span className="text-xs font-bold" style={{ color: '#E87040' }}>⚡ Strategic Plan</span>
        {plan.complexity && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{
              color: complexityColor[plan.complexity] ?? '#8A8A9A',
              background: `${complexityColor[plan.complexity] ?? '#8A8A9A'}18`,
              border: `1px solid ${complexityColor[plan.complexity] ?? '#8A8A9A'}35`,
            }}
          >
            {plan.complexity.toUpperCase()}
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        {plan.summary && (
          <p className="text-xs mb-3" style={{ color: '#8A8A9A' }}>{plan.summary}</p>
        )}
        <div className="flex flex-col gap-1.5">
          {plan.steps?.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className="text-[9px] font-bold mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center"
                style={{ background: 'rgba(232,112,64,0.12)', color: '#E87040' }}
              >
                {i + 1}
              </span>
              <div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: getAgentColor(step.agent?.toUpperCase()) }}
                >
                  {step.agent}
                </span>
                <p className="text-[11px]" style={{ color: '#55556A' }}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

const StatusEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center gap-2 py-0.5"
  >
    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#4ADE80' }} />
    <p className="text-xs" style={{ color: '#4ADE80' }}>{event.content}</p>
  </motion.div>
)

const AgentMarkerEvent: React.FC<{ event: StreamOutputProps['events'][0]; done?: boolean }> = ({ event, done }) => {
  const color = getAgentColor(event.agent_type ?? '')
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 py-1.5"
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 4 }}
    >
      <div className="h-px flex-1" style={{ background: `${color}28` }} />
      <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color }}>
        {getAgentIcon(event.agent_type ?? '')} {event.agent_name || event.agent_type}
        {done ? ' ✓' : ''}
      </span>
      <div className="h-px flex-1" style={{ background: `${color}28` }} />
    </motion.div>
  )
}

const OutputEvent: React.FC<{ event: StreamOutputProps['events'][0] }> = ({ event }) => {
  const color = getAgentColor(event.agent_type ?? '')
  const icon  = getAgentIcon(event.agent_type ?? '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 flex gap-3"
    >
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 mt-0.5"
        style={{ background: `${color}18`, border: `1px solid ${color}35` }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[10px] font-bold tracking-widest" style={{ color }}>
            {event.agent_name || event.agent_type || 'NEXUS'}
          </span>
          {event.timestamp && (
            <span className="text-[9px]" style={{ color: '#33333C' }}>
              {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <div
          className="rounded-xl px-3 py-2.5 text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
          style={{
            background: 'rgba(22,22,30,0.9)',
            border: `1px solid ${color}20`,
            color: '#C8C8E4',
          }}
        >
          <ReactMarkdown>{event.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  )
}

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
          case 'error':
            return (
              <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl px-3 py-2 my-1"
                style={{ background: 'rgba(239,96,96,0.08)', border: '1px solid rgba(239,96,96,0.25)', color: '#EF6060' }}
              >
                <p className="text-xs font-bold mb-0.5">Error</p>
                <p className="text-xs">{event.content}</p>
              </motion.div>
            )
          default: return null
        }
      })}
    </div>
  )
})

StreamOutput.displayName = 'StreamOutput'
