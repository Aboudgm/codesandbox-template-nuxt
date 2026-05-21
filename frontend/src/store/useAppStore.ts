import { create } from 'zustand'
import type { Task, AgentInfo } from '../types'

interface AppStore {
  // Tasks
  tasks: Task[]
  activeTaskId: string | null
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  setActiveTask: (id: string | null) => void

  // Agents
  agents: AgentInfo[]
  setAgents: (agents: AgentInfo[]) => void
  updateAgent: (id: string, updates: Partial<AgentInfo>) => void

  // Connection
  isConnected: boolean
  setConnected: (connected: boolean) => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  showNewTask: boolean
  setShowNewTask: (open: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  // Tasks
  tasks: [],
  activeTaskId: null,
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
    })),
  setActiveTask: (id) => set({ activeTaskId: id }),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  // Connection
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // UI
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  showNewTask: false,
  setShowNewTask: (open) => set({ showNewTask: open }),
}))
