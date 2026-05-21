import React, { useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { BottomNav } from './components/Layout/BottomNav'
import { Header } from './components/Layout/Header'
import { Dashboard } from './pages/Dashboard'
import { TasksList } from './pages/TasksList'
import { TaskDetail } from './pages/TaskDetail'
import { MemoryBrowser } from './pages/MemoryBrowser'
import { Settings } from './pages/Settings'
import { useAppStore } from './store/useAppStore'
import { getAgents, createTask } from './lib/api'
import { requestNotificationPermission } from './lib/notifications'

// ─── Neural Network Background ───────────────────────────────────────────────

const NeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let particles: Array<{
      x: number; y: number; vx: number; vy: number; radius: number; opacity: number
    }> = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const initParticles = () => {
      const count = Math.floor((canvas.width * canvas.height) / 18000)
      particles = Array.from({ length: Math.min(count, 60) }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.8 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      }))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const maxDist = 130
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(124,113,240,${p.opacity})`
        ctx.fill()

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.18
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            const g = ctx.createLinearGradient(p.x, p.y, p2.x, p2.y)
            g.addColorStop(0, `rgba(124,113,240,${opacity})`)
            g.addColorStop(0.5, `rgba(217,119,87,${opacity * 0.6})`)
            g.addColorStop(1, `rgba(79,195,247,${opacity})`)
            ctx.strokeStyle = g
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }
      animationId = requestAnimationFrame(animate)
    }

    resize()
    initParticles()
    animate()
    const onResize = () => { resize(); initParticles() }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.6 }}
    />
  )
}

// ─── Quick Task Sheet ─────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  'Research a topic in depth',
  'Write a professional report',
  'Analyze and summarize data',
  'Write and explain code',
  'Create a study plan',
]

const QuickTaskSheet: React.FC = () => {
  const { showNewTask, setShowNewTask, addTask } = useAppStore()
  const [goal, setGoal] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (showNewTask) {
      setTimeout(() => inputRef.current?.focus(), 150)
    } else {
      setGoal('')
      setCreating(false)
    }
  }, [showNewTask])

  const handleCreate = async () => {
    const trimmed = goal.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      const task = await createTask(trimmed)
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowNewTask(false)}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[70] px-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
          >
            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(14,14,26,0.99)',
                border: '1px solid rgba(42,45,74,0.9)',
                boxShadow: '0 -8px 48px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(42,45,74,0.5)',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(90,96,128,0.5)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(217,119,87,0.2), rgba(124,113,240,0.2))', border: '1px solid rgba(217,119,87,0.3)' }}
                >
                  <Sparkles size={15} style={{ color: '#D97757' }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">New Task</h2>
                  <p className="text-[11px] text-text-muted">Multi-agent AI will handle it</p>
                </div>
              </div>

              {/* Goal input */}
              <div
                className="rounded-2xl px-4 py-3 mb-3"
                style={{
                  background: 'rgba(10,10,20,0.8)',
                  border: '1px solid rgba(42,45,74,0.8)',
                }}
              >
                <textarea
                  ref={inputRef}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleCreate()
                    }
                  }}
                  placeholder="Describe what you want to accomplish..."
                  className="w-full bg-transparent text-sm text-text-primary placeholder-text-muted outline-none resize-none leading-relaxed"
                  rows={3}
                />
              </div>

              {/* Quick chips */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setGoal(chip)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                    style={{
                      background: goal === chip ? 'rgba(217,119,87,0.15)' : 'rgba(42,45,74,0.45)',
                      border: goal === chip ? '1px solid rgba(217,119,87,0.35)' : '1px solid rgba(42,45,74,0.6)',
                      color: goal === chip ? '#D97757' : '#9096B8',
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
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #D97757 0%, #B85C38 100%)',
                  boxShadow: '0 4px 20px rgba(217,119,87,0.35)',
                }}
              >
                {creating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Launching agents…
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Launch Task
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Page variants ────────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
}

const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.25 }

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/memory': 'Memory',
  '/settings': 'Settings',
}

// ─── App Content ──────────────────────────────────────────────────────────────

function AppContent() {
  const location = useLocation()
  const { setAgents, setConnected, isConnected } = useAppStore()

  const isTaskDetail =
    location.pathname.startsWith('/tasks/') && location.pathname !== '/tasks'

  const pageTitle = isTaskDetail
    ? 'Task Detail'
    : (pageTitles[location.pathname] ?? 'Nexus AI')

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const agents = await getAgents()
        setAgents(agents)
        setConnected(true)
      } catch {
        setConnected(false)
      }
    }
    fetchAgents()
    const interval = setInterval(fetchAgents, 15000)
    return () => clearInterval(interval)
  }, [setAgents, setConnected])

  useEffect(() => {
    if (isConnected) requestNotificationPermission()
  }, [isConnected])

  return (
    <div className="relative min-h-screen min-h-dvh bg-background text-text-primary overflow-x-hidden">
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
              transition={pageTransition}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<TasksList />} />
                <Route path="/tasks/:id" element={<TaskDetail />} />
                <Route path="/memory" element={<MemoryBrowser />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        {!isTaskDetail && <BottomNav />}
      </div>

      {/* Global quick-task overlay (always mounted so animation works) */}
      <QuickTaskSheet />
    </div>
  )
}

export default function App() {
  return <AppContent />
}
