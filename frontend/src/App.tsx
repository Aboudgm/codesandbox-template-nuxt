import React, { useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Plus, Sparkles, Command } from 'lucide-react'
import toast from 'react-hot-toast'

import { BottomNav }       from './components/Layout/BottomNav'
import { Header }          from './components/Layout/Header'
import { CommandPalette }  from './components/UI/CommandPalette'
import { Dashboard }       from './pages/Dashboard'
import { TasksList }       from './pages/TasksList'
import { TaskDetail }      from './pages/TaskDetail'
import { MemoryBrowser }   from './pages/MemoryBrowser'
import { Settings }        from './pages/Settings'
import { useAppStore }     from './store/useAppStore'
import { getAgents, createTask } from './lib/api'

// ─── Neural Canvas Background ─────────────────────────────────────────────────

const NeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId: number
    let pts: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = []

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }

    const init = () => {
      const n = Math.min(Math.floor((canvas.width * canvas.height) / 22000), 55)
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r:  Math.random() * 1.5 + 0.4,
        o:  Math.random() * 0.4 + 0.1,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const D = 120

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,229,255,${p.o})`
        ctx.fill()

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < D) {
            const alpha = (1 - dist / D) * 0.12
            const g = ctx.createLinearGradient(p.x, p.y, q.x, q.y)
            g.addColorStop(0, `rgba(0,229,255,${alpha})`)
            g.addColorStop(0.5, `rgba(124,113,240,${alpha * 0.5})`)
            g.addColorStop(1, `rgba(0,229,255,${alpha})`)
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = g
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      rafId = requestAnimationFrame(draw)
    }

    resize(); init(); draw()
    const onResize = () => { resize(); init() }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.5 }}
    />
  )
}

// ─── Quick Task Sheet ─────────────────────────────────────────────────────────

const CHIPS = [
  'Research a topic in depth',
  'Analyze and summarize data',
  'Write a professional report',
  'Write and explain code',
  'Create a strategic plan',
]

const QuickTaskSheet: React.FC = () => {
  const { showNewTask, setShowNewTask, addTask } = useAppStore()
  const [goal, setGoal]       = useState('')
  const [creating, setCreating] = useState(false)
  const navigate  = useNavigate()
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (showNewTask) setTimeout(() => inputRef.current?.focus(), 150)
    else { setGoal(''); setCreating(false) }
  }, [showNewTask])

  const handleCreate = async () => {
    const g = goal.trim()
    if (!g || creating) return
    setCreating(true)
    try {
      const task = await createTask(g)
      addTask(task)
      setShowNewTask(false)
      navigate(`/tasks/${task.id}`)
    } catch {
      toast.error('Failed to create task — check backend connection in Settings')
      setCreating(false)
    }
  }

  return (
    <AnimatePresence>
      {showNewTask && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowNewTask(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-[70] px-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
          >
            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(10,10,26,0.99)',
                border: '1px solid rgba(0,229,255,0.2)',
                boxShadow: '0 -16px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.05)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(60,64,96,0.6)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)' }}
                >
                  <Sparkles size={15} style={{ color: '#00E5FF' }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold" style={{ color: '#E8E8F8' }}>New Task</h2>
                  <p className="text-[11px]" style={{ color: '#4A4A70' }}>Multi-agent AI will handle it</p>
                </div>
              </div>

              {/* Input */}
              <div
                className="rounded-2xl px-4 py-3 mb-3"
                style={{ background: 'rgba(5,5,15,0.8)', border: '1px solid rgba(30,32,64,0.8)' }}
              >
                <textarea
                  ref={inputRef}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate() } }}
                  placeholder="Describe what you want to accomplish…"
                  className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed placeholder-text-muted"
                  style={{ color: '#E8E8F8' }}
                  rows={3}
                />
              </div>

              {/* Chips */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setGoal(chip)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                    style={{
                      background: goal === chip ? 'rgba(0,229,255,0.12)' : 'rgba(20,20,40,0.6)',
                      border:     goal === chip ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(30,32,64,0.6)',
                      color:      goal === chip ? '#00E5FF' : '#4A4A70',
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={!goal.trim() || creating}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #D97757 0%, #B85C38 100%)',
                  boxShadow: '0 4px 24px rgba(217,119,87,0.4)',
                }}
              >
                {creating ? (
                  <><Loader2 size={15} className="animate-spin" /> Launching agents…</>
                ) : (
                  <><Plus size={15} /> Launch Task</>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Page transition ──────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -6 },
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard', '/tasks': 'Tasks', '/memory': 'Memory', '/settings': 'Settings',
}

// ─── App Content ──────────────────────────────────────────────────────────────

function AppContent() {
  const location = useLocation()
  const { setAgents, setConnected, setCmdPalette } = useAppStore()

  const isTaskDetail = location.pathname.startsWith('/tasks/') && location.pathname !== '/tasks'
  const pageTitle    = isTaskDetail
    ? 'Task Detail'
    : (pageTitles[location.pathname] ?? 'NEXUS AI')

  // Poll agents every 15s
  useEffect(() => {
    const fetch = async () => {
      try { setAgents(await getAgents()); setConnected(true) }
      catch { setConnected(false) }
    }
    fetch()
    const id = setInterval(fetch, 15000)
    return () => clearInterval(id)
  }, [setAgents, setConnected])

  // ⌘K / Ctrl+K to open command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCmdPalette])

  return (
    <div className="relative min-h-screen min-h-dvh overflow-x-hidden" style={{ background: '#05050F' }}>
      <NeuralBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        <Header title={pageTitle} showBack={isTaskDetail} />

        <main
          className="pt-16"
          style={{
            paddingBottom: isTaskDetail
              ? '1rem'
              : 'calc(env(safe-area-inset-bottom) + 5.5rem)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={{ type: 'tween', ease: 'anticipate', duration: 0.22 }}
            >
              <Routes location={location}>
                <Route path="/"          element={<Dashboard />} />
                <Route path="/tasks"     element={<TasksList />} />
                <Route path="/tasks/:id" element={<TaskDetail />} />
                <Route path="/memory"    element={<MemoryBrowser />} />
                <Route path="/settings"  element={<Settings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        {!isTaskDetail && <BottomNav />}
      </div>

      {/* Global overlays */}
      <QuickTaskSheet />
      <CommandPalette />
    </div>
  )
}

export default function App() {
  return <AppContent />
}
