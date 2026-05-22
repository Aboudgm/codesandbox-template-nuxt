/**
 * SSE streaming client for real-time agent event consumption.
 * Connects to /api/tasks/{id}/stream and dispatches typed events.
 */
import type { StreamEvent, StreamEventType } from '../types'

export type StreamCallback = (event: StreamEvent | { type: 'done' | 'task_done'; status?: string; task_id?: string }) => void

export function connectTaskStream(taskId: string, onEvent: StreamCallback, backendUrl?: string): () => void {
  const base = (backendUrl || localStorage.getItem('nexus_backend_url') || 'http://localhost:8000').replace(/\/$/, '')
  const url = `${base}/api/tasks/${taskId}/stream`

  let es: EventSource | null = null
  let closed = false

  function connect() {
    if (closed) return
    es = new EventSource(url)

    es.onmessage = (e) => {
      if (!e.data || e.data.trim() === '') return
      try {
        const data = JSON.parse(e.data)
        onEvent(data)
        // Auto-close on done signal
        if (data.type === 'task_done' || data.type === 'done') {
          es?.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      es?.close()
      if (!closed) {
        // Signal connection loss
        onEvent({ type: 'done', status: 'error' })
      }
    }
  }

  connect()

  return () => {
    closed = true
    es?.close()
  }
}

export function getAgentColor(agentType: string): string {
  const map: Record<string, string> = {
    STRATEGIST:   '#D97757',
    ORCHESTRATOR: '#D97757',
    RESEARCHER:   '#00E5FF',
    CODER:        '#00FFB3',
    WRITER:       '#C084FC',
    MEMORY:       '#FFB74D',
  }
  return map[agentType?.toUpperCase()] ?? '#7C71F0'
}

export function getAgentIcon(agentType: string): string {
  const map: Record<string, string> = {
    STRATEGIST:   '⚡',
    ORCHESTRATOR: '⚡',
    RESEARCHER:   '🔍',
    CODER:        '⚙️',
    WRITER:       '✍️',
    MEMORY:       '🧠',
  }
  return map[agentType?.toUpperCase()] ?? '🤖'
}

export function getEventLabel(type: StreamEventType | string): string {
  const map: Record<string, string> = {
    thinking:     'Thinking',
    tool_call:    'Tool Call',
    tool_result:  'Result',
    output:       'Output',
    agent_start:  'Starting',
    agent_done:   'Done',
    plan:         'Plan',
    error:        'Error',
    status:       'Status',
    task_started: 'Task Started',
    task_done:    'Task Done',
  }
  return map[type] ?? type
}
