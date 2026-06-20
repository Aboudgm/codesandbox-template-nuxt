import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface NexusGreetingProps {
  taskCount?: number
  activeTasks?: number
}

function getGreeting(): { title: string; subtitle: string } {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return { title: 'Good morning.', subtitle: 'The agents are ready.' }
  if (h >= 12 && h < 17) return { title: 'Good afternoon.', subtitle: 'What are we solving today?' }
  if (h >= 17 && h < 21) return { title: 'Evening.', subtitle: 'Best ideas happen after dark.' }
  return { title: 'Running late?', subtitle: 'Or is this an early start?' }
}

function useTypewriter(text: string, speed = 40): string {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return displayed
}

export const NexusGreeting: React.FC<NexusGreetingProps> = ({ taskCount = 0, activeTasks = 0 }) => {
  const { title, subtitle } = getGreeting()
  const typed = useTypewriter(subtitle, 38)
  const showCursor = typed.length < subtitle.length

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-3"
      >
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{
            background: 'rgba(232,112,64,0.08)',
            border: '1px solid rgba(232,112,64,0.18)',
          }}
        >
          <span style={{ fontSize: 10 }}>⚡</span>
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ color: '#E87040' }}
          >
            NEXUS AI v3.0
          </span>
        </div>

        {activeTasks > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{
              background: 'rgba(232,112,64,0.06)',
              border: '1px solid rgba(232,112,64,0.14)',
            }}
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#E87040' }}
            />
            <span className="text-[9px] font-semibold" style={{ color: '#E87040' }}>
              {activeTasks} running
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-[2.4rem] font-black mb-1 leading-none tracking-tight"
        style={{
          background: 'linear-gradient(135deg, #F0EEE8 0%, #E87040 48%, #9B8CE8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {title}
      </motion.h1>

      {/* Typewriter subtitle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-0.5 h-6"
      >
        <span className="text-sm font-medium" style={{ color: '#8A8A9A' }}>
          {typed}
        </span>
        {showCursor && (
          <span
            className="inline-block w-0.5 h-4 rounded-sm"
            style={{
              background: '#E87040',
              animation: 'typewriterCursor 0.8s ease-in-out infinite',
            }}
          />
        )}
      </motion.div>

      {/* Context chips */}
      {taskCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 mt-3"
        >
          <span
            className="text-[10px] px-2 py-0.5 rounded-md"
            style={{
              background: 'rgba(45,212,191,0.07)',
              border: '1px solid rgba(45,212,191,0.15)',
              color: '#2DD4BF',
            }}
          >
            {taskCount} task{taskCount !== 1 ? 's' : ''} total
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-md"
            style={{
              background: 'rgba(155,140,232,0.07)',
              border: '1px solid rgba(155,140,232,0.15)',
              color: '#9B8CE8',
            }}
          >
            5 agents ready
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
