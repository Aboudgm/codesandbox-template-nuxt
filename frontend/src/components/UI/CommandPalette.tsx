import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Zap, Database, Settings, List, Home, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  group: string
}

export const CommandPalette: React.FC = () => {
  const { cmdPaletteOpen, setCmdPalette, tasks, setShowNewTask } = useAppStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const baseCommands: Command[] = [
    {
      id: 'home',       label: 'Dashboard',   description: 'Go to command center',
      icon: <Home size={14} />,    action: () => navigate('/'),        group: 'Navigate',
    },
    {
      id: 'tasks',      label: 'Tasks',        description: 'View all tasks',
      icon: <List size={14} />,    action: () => navigate('/tasks'),   group: 'Navigate',
    },
    {
      id: 'memory',     label: 'Memory',       description: 'Browse knowledge store',
      icon: <Database size={14} />,action: () => navigate('/memory'),  group: 'Navigate',
    },
    {
      id: 'settings',   label: 'Settings',     description: 'Configure API keys & models',
      icon: <Settings size={14} />,action: () => navigate('/settings'),group: 'Navigate',
    },
    {
      id: 'new-task',   label: 'New Task',     description: 'Launch a new AI task',
      icon: <Plus size={14} />,    action: () => { setShowNewTask(true) }, group: 'Actions',
    },
  ]

  const taskCommands: Command[] = tasks.slice(0, 8).map((t) => ({
    id:   `task-${t.id}`,
    label: t.goal.slice(0, 50),
    description: t.status,
    icon: <Zap size={14} style={{ color: t.status === 'running' ? '#D97757' : '#4A4A70' }} />,
    action: () => navigate(`/tasks/${t.id}`),
    group: 'Recent Tasks',
  }))

  const allCommands = [...baseCommands, ...taskCommands]
  const filtered = query.trim()
    ? allCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase()),
      )
    : allCommands

  const groups = Array.from(new Set(filtered.map((c) => c.group)))
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    if (cmdPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
    }
  }, [cmdPaletteOpen])

  const close = useCallback(() => setCmdPalette(false), [setCmdPalette])

  const run = useCallback(
    (cmd: Command) => {
      close()
      setTimeout(() => cmd.action(), 60)
    },
    [close],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!cmdPaletteOpen) return
      if (e.key === 'Escape') {
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((s) => Math.min(s + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((s) => Math.max(s - 1, 0))
      } else if (e.key === 'Enter') {
        if (filtered[selected]) run(filtered[selected])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdPaletteOpen, filtered, selected, close, run])

  return (
    <AnimatePresence>
      {cmdPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 500 }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-[91] w-full max-w-lg mx-4"
            style={{ width: 'min(92vw, 560px)' }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(10, 10, 26, 0.98)',
                border: '1px solid rgba(0,229,255,0.2)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,229,255,0.05), 0 0 60px rgba(0,229,255,0.06)',
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(30,32,64,0.8)' }}>
                <Search size={16} style={{ color: '#00E5FF', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands, tasks, memory…"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: '#E8E8F8' }}
                />
                <kbd
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(30,32,64,0.6)',
                    border: '1px solid rgba(60,64,96,0.6)',
                    color: '#8080B0',
                    fontFamily: 'monospace',
                  }}
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto no-scrollbar py-2">
                {filtered.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: '#4A4A70' }}>
                    No commands found
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group}>
                      <p
                        className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: '#4A4A70' }}
                      >
                        {group}
                      </p>
                      {filtered
                        .filter((c) => c.group === group)
                        .map((cmd, _idx) => {
                          const globalIdx = filtered.indexOf(cmd)
                          return (
                            <button
                              key={cmd.id}
                              onClick={() => run(cmd)}
                              onMouseEnter={() => setSelected(globalIdx)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                              style={{
                                background:
                                  globalIdx === selected
                                    ? 'rgba(0,229,255,0.08)'
                                    : 'transparent',
                                borderLeft:
                                  globalIdx === selected
                                    ? '2px solid rgba(0,229,255,0.5)'
                                    : '2px solid transparent',
                              }}
                            >
                              <span style={{ color: globalIdx === selected ? '#00E5FF' : '#4A4A70' }}>
                                {cmd.icon}
                              </span>
                              <span
                                className="flex-1 text-sm font-medium"
                                style={{ color: globalIdx === selected ? '#E8E8F8' : '#8080B0' }}
                              >
                                {cmd.label}
                              </span>
                              {cmd.description && (
                                <span className="text-xs" style={{ color: '#4A4A70' }}>
                                  {cmd.description}
                                </span>
                              )}
                            </button>
                          )
                        })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-4 px-4 py-2.5 text-[10px]"
                style={{ borderTop: '1px solid rgba(30,32,64,0.6)', color: '#4A4A70' }}
              >
                <span><kbd style={{ fontFamily: 'monospace' }}>↑↓</kbd> navigate</span>
                <span><kbd style={{ fontFamily: 'monospace' }}>↵</kbd> select</span>
                <span><kbd style={{ fontFamily: 'monospace' }}>ESC</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
