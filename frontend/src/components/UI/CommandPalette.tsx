import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Zap, Database, Settings, List, Home, Plus } from 'lucide-react'
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
      id: 'home',     label: 'Dashboard', description: 'Go to command center',
      icon: <Home size={14} />,     action: () => navigate('/'),         group: 'Navigate',
    },
    {
      id: 'tasks',    label: 'Tasks',     description: 'View all tasks',
      icon: <List size={14} />,     action: () => navigate('/tasks'),    group: 'Navigate',
    },
    {
      id: 'memory',   label: 'Memory',    description: 'Browse knowledge store',
      icon: <Database size={14} />, action: () => navigate('/memory'),   group: 'Navigate',
    },
    {
      id: 'settings', label: 'Settings',  description: 'Configure API keys & models',
      icon: <Settings size={14} />, action: () => navigate('/settings'), group: 'Navigate',
    },
    {
      id: 'new-task', label: 'New Task',  description: 'Launch a new AI task',
      icon: <Plus size={14} />,     action: () => { setShowNewTask(true) }, group: 'Actions',
    },
  ]

  const taskCommands: Command[] = tasks.slice(0, 8).map((t) => ({
    id:   `task-${t.id}`,
    label: t.goal.slice(0, 50),
    description: t.status,
    icon: <Zap size={14} style={{ color: t.status === 'running' ? '#E87040' : '#33333C' }} />,
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

  useEffect(() => { setSelected(0) }, [query])

  useEffect(() => {
    if (cmdPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
    }
  }, [cmdPaletteOpen])

  const close = useCallback(() => setCmdPalette(false), [setCmdPalette])

  const run = useCallback(
    (cmd: Command) => { close(); setTimeout(() => cmd.action(), 60) },
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
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 480 }}
            className="fixed top-[14vh] left-1/2 -translate-x-1/2 z-[91]"
            style={{ width: 'min(92vw, 540px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(10,8,18,0.99)',
                border: '1px solid rgba(232,112,64,0.2)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.85), 0 0 60px rgba(232,112,64,0.06)',
              }}
            >
              {/* Search input */}
              <div
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: '1px solid rgba(50,46,68,0.7)' }}
              >
                <Search size={16} style={{ color: '#E87040', flexShrink: 0 }} aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands, tasks…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-muted"
                  style={{ color: '#EEEEF0' }}
                  role="combobox"
                  aria-expanded={filtered.length > 0}
                  aria-controls="cmd-palette-list"
                  aria-activedescendant={filtered[selected] ? `cmd-item-${filtered[selected].id}` : undefined}
                  aria-autocomplete="list"
                  aria-label="Search commands"
                />
                <kbd
                  className="text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: 'rgba(30,28,42,0.7)',
                    border: '1px solid rgba(60,56,80,0.6)',
                    color: '#33333C',
                  }}
                  aria-hidden="true"
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                id="cmd-palette-list"
                role="listbox"
                aria-label="Commands"
                className="max-h-80 overflow-y-auto no-scrollbar py-2"
              >
                {filtered.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: '#33333C' }} role="status">
                    No commands found
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group} role="group" aria-label={group}>
                      <p
                        className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: '#33333C' }}
                        aria-hidden="true"
                      >
                        {group}
                      </p>
                      {filtered
                        .filter((c) => c.group === group)
                        .map((cmd) => {
                          const globalIdx = filtered.indexOf(cmd)
                          const isSelected = globalIdx === selected
                          return (
                            <button
                              key={cmd.id}
                              id={`cmd-item-${cmd.id}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => run(cmd)}
                              onMouseEnter={() => setSelected(globalIdx)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                              style={{
                                background: isSelected ? 'rgba(232,112,64,0.08)' : 'transparent',
                                borderLeft: isSelected
                                  ? '2px solid rgba(232,112,64,0.5)'
                                  : '2px solid transparent',
                              }}
                            >
                              <span style={{ color: isSelected ? '#E87040' : '#33333C' }} aria-hidden="true">
                                {cmd.icon}
                              </span>
                              <span
                                className="flex-1 text-sm font-medium"
                                style={{ color: isSelected ? '#EEEEF0' : '#6A6A8A' }}
                              >
                                {cmd.label}
                              </span>
                              {cmd.description && (
                                <span className="text-xs" style={{ color: '#33333C' }} aria-hidden="true">
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
                style={{ borderTop: '1px solid rgba(255,255,255,0.055)', color: '#33333C' }}
                aria-hidden="true"
              >
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> select</span>
                <span><kbd className="font-mono">ESC</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
