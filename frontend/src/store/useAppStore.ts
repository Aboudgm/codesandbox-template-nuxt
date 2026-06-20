import { create } from 'zustand'
import type { Task, AgentInfo, StreamEvent } from '../types'

interface AppStore {
  // Tasks
  tasks: Task[]
  activeTaskId: string | null
  setTasks:    (tasks: Task[]) => void
  addTask:     (task: Task) => void
  updateTask:  (id: string, updates: Partial<Task>) => void
  removeTask:  (id: string) => void
  setActiveTask: (id: string | null) => void

  // Agents
  agents: AgentInfo[]
  setAgents:  (agents: AgentInfo[]) => void
  updateAgent: (id: string, updates: Partial<AgentInfo>) => void

  // Connection
  isConnected: boolean
  setConnected: (connected: boolean) => void

  // Live stream events (last N per task)
  streamEvents: Record<string, StreamEvent[]>
  appendStreamEvent: (taskId: string, event: StreamEvent) => void
  clearStreamEvents:  (taskId: string) => void

  // UI
  showNewTask:    boolean
  setShowNewTask: (open: boolean) => void
  cmdPaletteOpen: boolean
  setCmdPalette:  (open: boolean) => void
}

const MAX_EVENTS_PER_TASK = 500

export const useAppStore = create<AppStore>((set) => ({
  // Tasks
  tasks: [],
  activeTaskId: null,
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, updates) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  removeTask: (id) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
    })),
  setActiveTask: (id) => set({ activeTaskId: id }),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgent: (id, updates) =>
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),

  // Connection
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Stream events
  streamEvents: {},
  appendStreamEvent: (taskId, event) =>
    set((s) => {
      const existing = s.streamEvents[taskId] ?? []
      const updated = [...existing, event].slice(-MAX_EVENTS_PER_TASK)
      return { streamEvents: { ...s.streamEvents, [taskId]: updated } }
    }),
  clearStreamEvents: (taskId) =>
    set((s) => {
      const { [taskId]: _, ...rest } = s.streamEvents
      return { streamEvents: rest }
    }),

  // UI
  showNewTask:    false,
  setShowNewTask: (open) => set({ showNewTask: open }),
  cmdPaletteOpen: false,
  setCmdPalette:  (open) => set({ cmdPaletteOpen: open }),
}))
