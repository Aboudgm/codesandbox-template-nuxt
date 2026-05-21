import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { MessageBubble } from '../Chat/MessageBubble'
import type { AgentMessage } from '../../types'

interface TaskTimelineProps {
  messages: AgentMessage[]
  isLive?: boolean
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({ messages, isLive = false }) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showScrollFab, setShowScrollFab] = useState(false)
  const prevLengthRef = useRef(messages.length)

  // Scroll to bottom when new messages arrive (if auto-scroll enabled)
  useEffect(() => {
    const hasNewMessages = messages.length > prevLengthRef.current
    prevLengthRef.current = messages.length

    if (hasNewMessages && autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, autoScroll])

  // Detect manual scroll to show FAB
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distFromBottom = scrollHeight - scrollTop - clientHeight
      const isNearBottom = distFromBottom < 80
      setAutoScroll(isNearBottom)
      setShowScrollFab(!isNearBottom && messages.length > 3)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAutoScroll(true)
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(42,45,74,0.4)' }}
        >
          <span className="text-2xl">🤖</span>
        </div>
        <p className="text-text-muted text-sm text-center">
          {isLive ? 'Waiting for agents to respond...' : 'No messages yet'}
        </p>
        {isLive && (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="overflow-y-auto"
        style={{ maxHeight: '60vh' }}
      >
        <div className="py-2 divide-y divide-border/20">
          <AnimatePresence initial={false}>
            {messages.map((message, i) => (
              <MessageBubble
                key={message.id}
                message={message}
                isNew={i === messages.length - 1 && isLive}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                />
              ))}
            </div>
            <span className="text-xs text-text-muted">Agents working...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom FAB */}
      <AnimatePresence>
        {showScrollFab && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
            style={{
              background: 'rgba(26,26,46,0.95)',
              border: '1px solid rgba(217,119,87,0.4)',
              color: '#D97757',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            <ChevronDown size={14} />
            Latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
