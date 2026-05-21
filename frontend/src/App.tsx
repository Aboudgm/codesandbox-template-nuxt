import React, { useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/Layout/BottomNav'
import { Header } from './components/Layout/Header'
import { Dashboard } from './pages/Dashboard'
import { TasksList } from './pages/TasksList'
import { TaskDetail } from './pages/TaskDetail'
import { MemoryBrowser } from './pages/MemoryBrowser'
import { Settings } from './pages/Settings'
import { useAppStore } from './store/useAppStore'
import { getAgents } from './lib/api'

// Neural Network Background Canvas
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

    const drawParticle = (p: typeof particles[0]) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(124, 113, 240, ${p.opacity})`
      ctx.fill()
    }

    const drawConnection = (p1: typeof particles[0], p2: typeof particles[0], dist: number, maxDist: number) => {
      const opacity = (1 - dist / maxDist) * 0.18
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
      gradient.addColorStop(0, `rgba(124, 113, 240, ${opacity})`)
      gradient.addColorStop(0.5, `rgba(217, 119, 87, ${opacity * 0.6})`)
      gradient.addColorStop(1, `rgba(79, 195, 247, ${opacity})`)
      ctx.strokeStyle = gradient
      ctx.lineWidth = 0.6
      ctx.stroke()
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

        drawParticle(p)

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            drawConnection(p, p2, dist, maxDist)
          }
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    resize()
    initParticles()
    animate()

    window.addEventListener('resize', () => {
      resize()
      initParticles()
    })

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
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

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.25,
}

// Page title map
const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Tasks',
  '/memory': 'Memory',
  '/settings': 'Settings',
}

function AppContent() {
  const location = useLocation()
  const { setAgents, setConnected } = useAppStore()

  // Determine if on task detail (hide bottom nav)
  const isTaskDetail = location.pathname.startsWith('/tasks/') && location.pathname !== '/tasks'

  // Resolve page title
  const pageTitle = isTaskDetail
    ? 'Task Detail'
    : (pageTitles[location.pathname] ?? 'Nexus AI')

  // Poll agents on mount
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

  return (
    <div className="relative min-h-screen min-h-dvh bg-background text-text-primary overflow-x-hidden">
      <NeuralBackground />

      {/* Content layer */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Header title={pageTitle} showBack={isTaskDetail} />

        <main
          className="pt-16"
          style={{
            paddingBottom: isTaskDetail ? '1rem' : 'calc(env(safe-area-inset-bottom) + 5rem)',
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
    </div>
  )
}

export default function App() {
  return <AppContent />
}
