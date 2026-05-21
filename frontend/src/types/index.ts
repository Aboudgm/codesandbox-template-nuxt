export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed'
export type AgentType = 'orchestrator' | 'researcher' | 'coder' | 'writer' | 'memory'
export type AgentState = 'idle' | 'thinking' | 'acting' | 'waiting' | 'done' | 'error'

export interface AgentMessage {
  id: string
  agent_type: AgentType
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
  default_model?: string
  temperature?: number
  max_tokens?: number
  memory_enabled?: boolean
  code_execution_enabled?: boolean
  max_concurrent_agents?: number
}

export interface Stats {
  total_tasks: number
  memories_stored: number
  agents_available: number
}
