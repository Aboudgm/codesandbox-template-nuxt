import axios from 'axios'
import type { Task, AgentInfo, Memory, Config } from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => {
    // Guard: if Netlify (or any proxy) returns HTML instead of JSON, reject it
    // so react-query treats it as an error rather than returning HTML as data.
    const ct = String(response.headers?.['content-type'] ?? '')
    if (ct.includes('text/html') && typeof response.data === 'string') {
      return Promise.reject(new Error('Backend unavailable (received HTML instead of JSON)'))
    }
    return response
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Tasks
export async function createTask(goal: string): Promise<Task> {
  const { data } = await api.post<Task>('/tasks', { goal })
  return data
}

export async function getTasks(): Promise<Task[]> {
  const { data } = await api.get<Task[]>('/tasks')
  return data
}

export async function getTask(id: string): Promise<Task> {
  const { data } = await api.get<Task>(`/tasks/${id}`)
  return data
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`)
}

export async function pauseTask(id: string): Promise<Task> {
  const { data } = await api.post<Task>(`/tasks/${id}/pause`)
  return data
}

export async function resumeTask(id: string): Promise<Task> {
  const { data } = await api.post<Task>(`/tasks/${id}/resume`)
  return data
}

// Agents
export async function getAgents(): Promise<AgentInfo[]> {
  const { data } = await api.get<AgentInfo[]>('/agents')
  return data
}

// Memory
export async function searchMemory(query: string): Promise<Memory[]> {
  const { data } = await api.get<Memory[]>('/memory/search', {
    params: { q: query },
  })
  return data
}

export async function getRecentMemories(): Promise<Memory[]> {
  const { data } = await api.get<Memory[]>('/memory/recent')
  return data
}

export async function getMemoryStats(): Promise<any> {
  const { data } = await api.get('/memory/stats')
  return data
}

export async function deleteMemory(id: string): Promise<void> {
  await api.delete(`/memory/${id}`)
}

export async function clearMemories(): Promise<void> {
  await api.delete('/memory/all')
}

// Config
export async function getConfig(): Promise<Config> {
  const { data } = await api.get<Config>('/config')
  return data
}

export async function updateConfig(config: Partial<Config>): Promise<Config> {
  const { data } = await api.put<Config>('/config', config)
  return data
}

export async function testConnection(
  provider: 'anthropic' | 'openai' | 'gemini',
  key?: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/config/test/${provider}`,
    key ? { key } : {},
  )
  return data
}

export async function getStats(): Promise<{ total_tasks: number; memories_stored: number; agents_available: number }> {
  const { data } = await api.get('/stats')
  return data
}

export default api
