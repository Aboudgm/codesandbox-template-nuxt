import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'

interface HeaderProps {
  title: string
  showBack?: boolean
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate()
  const isConnected = useAppStore((s) => s.isConnected)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-16"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgba(10, 10, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(42, 45, 74, 0.4)',
      }}
    >
      {/* Left: Back button or Logo */}
      <div className="flex items-center gap-3 flex-1">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors active:bg-elevated"
            style={{ background: 'rgba(42, 45, 74, 0.4)' }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* Animated logo mark */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 8px rgba(217,119,87,0.3)',
                  '0 0 16px rgba(217,119,87,0.6)',
                  '0 0 8px rgba(217,119,87,0.3)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D97757, #7C71F0)' }}
            >
              <span className="text-white font-bold text-sm">N</span>
            </motion.div>

            <span
              className="font-bold text-base tracking-widest"
              style={{
                background: 'linear-gradient(135deg, #D97757 0%, #C4663E 40%, #7C71F0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NEXUS AI
            </span>
          </div>
        )}
      </div>

      {/* Center: Page title (when on sub-pages) */}
      {showBack && (
        <div className="flex-1 flex justify-center">
          <span className="text-text-primary font-semibold text-sm truncate max-w-[160px]">
            {title}
          </span>
        </div>
      )}

      {/* Right: Status + Notification */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={isConnected ? {
              scale: [1, 1.3, 1],
              opacity: [1, 0.7, 1],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isConnected ? '#4ECCA3' : '#EF5350' }}
          />
          <span className="text-xs text-text-muted hidden sm:block">
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* Notification bell */}
        <button
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors active:bg-elevated"
          style={{ background: 'rgba(42, 45, 74, 0.3)' }}
          aria-label="Notifications"
        >
          <Bell size={18} className="text-text-secondary" />
        </button>
      </div>
    </header>
  )
}
