import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const THOUGHTS = [
  "Five specialized minds. One unified intent.",
  "ARIA researches. FORGE codes. SCRIBE writes. ECHO remembers. I orchestrate.",
  "Complexity is my environment. Ambiguity is my fuel.",
  "I think in systems. Give me a goal — I'll build the path.",
  "Parallel execution. Sequential reasoning. Always adapting.",
  "Every task is a new architecture. I design on the fly.",
  "Research + Code + Write, deployed simultaneously. That's the edge.",
]

function getGreeting(hour: number): string {
  if (hour < 5)  return "Still up?"
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  if (hour < 21) return "Good evening"
  return "Late-night mode"
}

function getSubtext(hour: number): string {
  if (hour < 5)  return "Night owls get the best work done."
  if (hour < 12) return "Fresh context. Let's start something ambitious."
  if (hour < 17) return "Deep work hours. What's the hardest thing on your list?"
  if (hour < 21) return "Wind-down or push through — I'm with you either way."
  return "The best ideas come when the world is quiet."
}

export const NexusGreeting: React.FC = () => {
  const [hour]       = useState(() => new Date().getHours())
  const [thoughtIdx, setThoughtIdx] = useState(0)
  const [tick, setTick]             = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setThoughtIdx((i) => (i + 1) % THOUGHTS.length)
      setTick((t) => t + 1)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex items-start gap-3 mb-2"
    >
      {/* Nexus orb */}
      <div className="flex-shrink-0 mt-0.5">
        <motion.div
          animate={{
            boxShadow: [
              '0 0 8px rgba(232,112,64,0.35)',
              '0 0 20px rgba(232,112,64,0.65)',
              '0 0 8px rgba(232,112,64,0.35)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 35% 35%, rgba(232,112,64,0.3), rgba(8,8,12,0.95))',
            border: '1px solid rgba(232,112,64,0.45)',
          }}
        >
          <span className="text-base select-none" aria-hidden="true">⚡</span>
        </motion.div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className="text-[11px] font-black tracking-widest uppercase"
            style={{ color: '#E87040' }}
          >
            NEXUS
          </span>
          <span className="text-[11px]" style={{ color: '#55556A' }}>
            · {getGreeting(hour)}
          </span>
        </div>

        <p className="text-[13px] font-medium leading-snug mb-1" style={{ color: '#F0F0F4' }}>
          {getSubtext(hour)}
        </p>

        <AnimatePresence mode="wait">
          <motion.p
            key={tick}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
            className="text-[11px] leading-relaxed"
            style={{ color: '#55556A' }}
          >
            {THOUGHTS[thoughtIdx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
