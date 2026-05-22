import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, BellOff, Command } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { checkBackendHealth } from '../../lib/api'

interface HeaderProps {
  title: string
  showBack?: boolean
}

let deferredInstallPrompt: any = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstallPrompt = e
  })
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate()
  const { isConnected, tasks, setCmdPalette } = useAppStore()
  const [notifEnabled, setNotifEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  )
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const running = tasks.filter((t) => t.status === 'running').length

  useEffect(() => {
    let mounted = true
    const check = async () => {
      const ok = await checkBackendHealth()
      if (mounted) setBackendStatus(ok ? 'online' : 'offline')
    }
    check()
    const id = setInterval(check, 15000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  const handleNotifToggle = useCallback(async () => {
    if (notifEnabled || typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifEnabled(perm === 'granted')
  }, [notifEnabled])

  const statusColor =
    backendStatus === 'online' ? '#00FFB3' :
    backendStatus === 'offline' ? '#FF5370' : '#FFB74D'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-16"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgba(5,5,15,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,229,255,0.07)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 flex-1">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)' }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} style={{ color: '#00E5FF' }} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 8px rgba(0,229,255,0.3)',
                  '0 0 20px rgba(0,229,255,0.7)',
                  '0 0 8px rgba(0,229,255,0.3)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00E5FF20, #D9775720)' }}
            >
              <span className="text-white font-black text-xs select-none" style={{ background: 'linear-gradient(135deg, #00E5FF, #D97757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>N</span>
            </motion.div>
            <span
              className="font-black text-sm tracking-widest"
              style={{
                background: 'linear-gradient(135deg, #E8E8F8 0%, #00E5FF 50%, #7C71F0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NEXUS
            </span>
          </div>
        )}
      </div>

      {/* Center title on sub-pages */}
      {showBack && (
        <div className="flex-1 flex justify-center">
          <span className="text-sm font-semibold truncate max-w-[160px]" style={{ color: '#E8E8F8' }}>
            {title}
          </span>
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        {/* Backend status */}
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={backendStatus === 'online' ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        {/* Running badge */}
        <AnimatePresence>
          {running > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(217,119,87,0.12)',
                border: '1px solid rgba(217,119,87,0.3)',
                color: '#D97757',
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#D97757' }}
              />
              {running}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ⌘K command palette */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setCmdPalette(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{
            background: 'rgba(0,229,255,0.06)',
            border: '1px solid rgba(0,229,255,0.12)',
          }}
          aria-label="Command palette"
          title="Command palette (⌘K)"
        >
          <Command size={15} style={{ color: '#00E5FF' }} />
        </motion.button>

        {/* Notification bell */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleNotifToggle}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{
            background: notifEnabled ? 'rgba(0,255,179,0.08)' : 'rgba(30,32,64,0.3)',
            border: notifEnabled ? '1px solid rgba(0,255,179,0.2)' : '1px solid transparent',
          }}
          aria-label={notifEnabled ? 'Notifications on' : 'Enable notifications'}
        >
          {notifEnabled
            ? <Bell size={15} style={{ color: '#00FFB3' }} />
            : <BellOff size={15} style={{ color: '#2A2A50' }} />
          }
        </motion.button>
      </div>
    </header>
  )
}
