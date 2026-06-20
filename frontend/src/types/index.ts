export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed'
export type AgentType = 'STRATEGIST' | 'RESEARCHER' | 'CODER' | 'WRITER' | 'MEMORY' | 'ORCHESTRATOR'
export type AgentState = 'idle' | 'thinking' | 'acting' | 'waiting' | 'done' | 'error'

export type StreamEventType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'output'
  | 'agent_start'
  | 'agent_done'
  | 'task_started'
  | 'task_done'
  | 'plan'
  | 'error'
  | 'status'
  | 'done'

export interface StreamEvent {
  id: string
  type: StreamEventType
  task_id: string
  agent_id: string
  agent_name: string
  agent_type: string
  content: string
  metadata: Record<string, unknown>
  timestamp: string
}

export interface AgentMessage {
  id: string
  agent_type: string
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface Task {
  id: string
  goal: string
  status: TaskStatus
  created_at: string
  updated_at: string
  messages: AgentMessage[]
  result?: string
  agents: string[]
}

export interface AgentInfo {
  id: string
  name: string
  type: AgentType
  state: AgentState
  current_task?: string
  messages_count: number
}

export interface Memory {
  id: string
  content: string
  metadata: Record<string, unknown>
  timestamp: string
  relevance_score?: number
}

export interface Config {
  anthropic_api_key?: string
  openai_api_key?: string
  gemini_api_key?: string
  xai_api_key?: string
  default_model?: string
  temperature?: number
  max_tokens?: number
  memory_enabled?: boolean
  code_execution_enabled?: boolean
  max_concurrent_agents?: number
  active_provider?: string
}

export interface Stats {
  total_tasks: number
  memories_stored: number
  agents_available: number
}

export interface PlanStep {
  agent: string
  description: string
  language?: string
}

export interface Plan {
  steps: PlanStep[]
  summary: string
  priorities: string[]
  complexity: 'low' | 'medium' | 'high'
}
