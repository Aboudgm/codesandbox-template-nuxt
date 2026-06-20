import React, { useEffect, useRef, useState, Suspense, lazy } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Plus, Sparkles, Command } from 'lucide-react'
import toast from 'react-hot-toast'

import { BottomNav }       from './components/Layout/BottomNav'
import { Header }          from './components/Layout/Header'
import { CommandPalette }  from './components/UI/CommandPalette'
import { useAppStore }     from './store/useAppStore'
import { getAgents, createTask } from './lib/api'

// ─── Lazy-loaded page chunks ──────────────────────────────────────────────────
// Each page is its own async chunk; TaskDetail defers the 787KB markdown bundle
const Dashboard    = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const TasksList    = lazy(() => import('./pages/TasksList').then(m => ({ default: m.TasksList })))
const TaskDetail   = lazy(() => import('./pages/TaskDetail').then(m => ({ default: m.TaskDetail })))
const MemoryBrowser = lazy(() => import('./pages/MemoryBrowser').then(m => ({ default: m.MemoryBrowser })))
const Settings     = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))

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
        ctx.fillStyle = `rgba(217,119,87,${p.o * 0.7})`
        ctx.fill()

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < D) {
            const alpha = (1 - dist / D) * 0.09
            const g = ctx.createLinearGradient(p.x, p.y, q.x, q.y)
            g.addColorStop(0, `rgba(217,119,87,${alpha})`)
            g.addColorStop(0.5, `rgba(192,132,252,${alpha * 0.4})`)
            g.addColorStop(1, `rgba(217,119,87,${alpha})`)
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
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[70] px-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Create new task"
          >
            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(10,8,18,0.99)',
                border: '1px solid rgba(217,119,87,0.18)',
                boxShadow: '0 -20px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(217,119,87,0.05)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(80,70,90,0.5)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(217,119,87,0.1)', border: '1px solid rgba(217,119,87,0.22)' }}
                >
                  <Sparkles size={15} style={{ color: '#D97757' }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold" style={{ color: '#EEEEF0' }}>New Task</h2>
                  <p className="text-[11px]" style={{ color: '#4A4A6A' }}>Multi-agent AI will handle it</p>
                </div>
              </div>

              {/* Input */}
              <div
                className="rounded-2xl px-4 py-3 mb-3"
                style={{ background: 'rgba(6,5,12,0.85)', border: '1px solid rgba(50,46,68,0.7)' }}
              >
                <textarea
                  ref={inputRef}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate() } }}
                  placeholder="Describe what you want to accomplish…"
                  className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed placeholder-muted"
                  style={{ color: '#EEEEF0' }}
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
                      background: goal === chip ? 'rgba(217,119,87,0.12)' : 'rgba(18,16,28,0.7)',
                      border:     goal === chip ? '1px solid rgba(217,119,87,0.35)' : '1px solid rgba(50,46,68,0.55)',
                      color:      goal === chip ? '#D97757' : '#4A4A6A',
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
                  background: 'linear-gradient(135deg, #E08060 0%, #C4663E 100%)',
                  boxShadow: '0 4px 24px rgba(217,119,87,0.38)',
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
    <div className="relative min-h-screen min-h-dvh overflow-x-hidden" style={{ background: '#080810' }}>
      {/* Skip-to-content for keyboard users (WCAG 2.4.1) */}
      <a href="#main-content" className="skip-nav">Skip to content</a>

      <NeuralBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        <Header title={pageTitle} showBack={isTaskDetail} />

        <main id="main-content"
          className="pt-14"
          style={{
            paddingBottom: isTaskDetail
              ? '1rem'
              : 'calc(env(safe-area-inset-bottom) + 5.5rem)',
          }}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                <Loader2 size={22} className="animate-spin" style={{ color: '#D97757', opacity: 0.7 }} />
              </div>
            }
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
          </Suspense>
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
