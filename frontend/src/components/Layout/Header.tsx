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
  const { tasks, setCmdPalette } = useAppStore()
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
    backendStatus === 'online'  ? '#00FFB3' :
    backendStatus === 'offline' ? '#FF5370' : '#FFB74D'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgba(8,8,16,0.94)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderBottom: '1px solid rgba(217,119,87,0.09)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 flex-1">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(217,119,87,0.08)', border: '1px solid rgba(217,119,87,0.18)' }}
            aria-label="Go back"
          >
            <ArrowLeft size={16} style={{ color: '#D97757' }} />
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            {/* Logo orb */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 6px rgba(217,119,87,0.3)',
                  '0 0 18px rgba(217,119,87,0.65)',
                  '0 0 6px rgba(217,119,87,0.3)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(145deg, rgba(217,119,87,0.22), rgba(217,119,87,0.06))' }}
            >
              <span
                className="font-black text-[11px] select-none"
                style={{
                  background: 'linear-gradient(135deg, #F0A070, #D97757)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                N
              </span>
            </motion.div>
            <span
              className="font-black text-sm tracking-[0.18em]"
              style={{
                background: 'linear-gradient(135deg, #F0EEE8 10%, #D97757 55%, #C084FC 100%)',
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
          <span className="text-sm font-semibold truncate max-w-[160px]" style={{ color: '#EEEEF0' }}>
            {title}
          </span>
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        {/* Backend status dot */}
        <div className="flex items-center gap-1.5 mr-1">
          <motion.div
            animate={backendStatus === 'online'
              ? { scale: [1, 1.4, 1], opacity: [0.9, 0.4, 0.9] }
              : {}
            }
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
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
                background: 'rgba(217,119,87,0.1)',
                border: '1px solid rgba(217,119,87,0.28)',
                color: '#D97757',
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#D97757' }}
              />
              {running}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ⌘K command palette */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setCmdPalette(true)}
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
          style={{
            background: 'rgba(217,119,87,0.07)',
            border: '1px solid rgba(217,119,87,0.16)',
          }}
          aria-label="Command palette"
          title="Command palette (⌘K)"
        >
          <Command size={14} style={{ color: '#D97757' }} />
        </motion.button>

        {/* Notification bell */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleNotifToggle}
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
          style={{
            background: notifEnabled ? 'rgba(0,255,179,0.07)' : 'rgba(30,28,42,0.4)',
            border: notifEnabled ? '1px solid rgba(0,255,179,0.18)' : '1px solid transparent',
          }}
          aria-label={notifEnabled ? 'Notifications on' : 'Enable notifications'}
        >
          {notifEnabled
            ? <Bell size={14} style={{ color: '#00FFB3' }} />
            : <BellOff size={14} style={{ color: '#38384A' }} />
          }
        </motion.button>
      </div>
    </header>
  )
}
