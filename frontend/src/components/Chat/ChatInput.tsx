import React, { useState, useRef, useCallback } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Send, Mic } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatInputProps {
  onSubmit: (goal: string) => void
  isLoading?: boolean
  placeholder?: string
}

const MAX_CHARS = 2000

export const ChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  isLoading = false,
  placeholder = 'Describe your goal... e.g. Research quantum computing and write a summary',
}) => {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setValue('')
  }, [value, isLoading, onSubmit])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const charCount = value.length
  const isOverLimit = charCount > MAX_CHARS
  const canSubmit = value.trim().length > 0 && !isLoading && !isOverLimit

  return (
    <div className="w-full px-4">
      <motion.div
        animate={{
          boxShadow: focused
            ? '0 0 0 1.5px rgba(232,112,64,0.45), 0 4px 32px rgba(232,112,64,0.1)'
            : '0 2px 20px rgba(0,0,0,0.35)',
        }}
        transition={{ duration: 0.18 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(18,16,28,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: focused
            ? '1px solid rgba(232,112,64,0.38)'
            : '1px solid rgba(255,255,255,0.055)',
        }}
      >
        {/* Textarea */}
        <TextareaAutosize
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          minRows={2}
          maxRows={8}
          className="w-full bg-transparent resize-none outline-none px-4 pt-4 pb-2 text-sm leading-relaxed placeholder-muted"
          style={{ fontFamily: 'Inter, sans-serif', color: '#EEEEF0' }}
          disabled={isLoading}
          maxLength={MAX_CHARS + 100}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left: Voice + char count */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
              style={{ background: 'rgba(29,29,38,0.5)' }}
              aria-label="Voice input"
              tabIndex={-1}
            >
              <Mic size={16} style={{ color: '#55556A' }} />
            </button>

            <AnimatePresence>
              {charCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-xs font-mono"
                  style={{ color: isOverLimit ? '#EF6060' : '#55556A' }}
                >
                  {charCount}/{MAX_CHARS}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Hint + Send */}
          <div className="flex items-center gap-2">
            {!isLoading && (
              <span className="text-xs hidden sm:block" style={{ color: '#55556A' }}>
                Enter · Shift+Enter for newline
              </span>
            )}

            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              whileTap={canSubmit ? { scale: 0.92 } : {}}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200"
              style={{
                background: canSubmit
                  ? 'linear-gradient(135deg, #E87040, #C4663E)'
                  : 'rgba(29,29,38,0.4)',
                boxShadow: canSubmit ? '0 4px 16px rgba(232,112,64,0.35)' : 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
              aria-label="Send"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                />
              ) : (
                <Send size={16} style={{ color: canSubmit ? '#fff' : '#55556A' }} />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
