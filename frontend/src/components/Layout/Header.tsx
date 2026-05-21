import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, BellOff, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { checkBackendHealth } from '../../lib/api'

interface HeaderProps {
  title: string
  showBack?: boolean
}

// PWA install prompt
let deferredInstallPrompt: any = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstallPrompt = e
})

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate()
  const { isConnected, tasks } = useAppStore()
  const [notifEnabled, setNotifEnabled] = useState(Notification.permission === 'granted')
  const [showInstall, setShowInstall] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const runningCount = tasks.filter((t) => t.status === 'running').length

  // Check backend health every 15s
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

  // Show install button when PWA prompt is available
  useEffect(() => {
    const handler = () => setShowInstall(!!deferredInstallPrompt)
    handler()
    window.addEventListener('appinstalled', () => setShowInstall(false))
    return () => {}
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredInstallPrompt) return
    deferredInstallPrompt.prompt()
    const { outcome } = await deferredInstallPrompt.userChoice
    if (outcome === 'accepted') {
      deferredInstallPrompt = null
      setShowInstall(false)
    }
  }, [])

  const handleNotifToggle = useCallback(async () => {
    if (notifEnabled) return
    const perm = await Notification.requestPermission()
    setNotifEnabled(perm === 'granted')
  }, [notifEnabled])

  const statusColor = backendStatus === 'online' ? '#4ECCA3' : backendStatus === 'offline' ? '#EF5350' : '#FFB74D'
  const statusLabel = backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : '…'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-16"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgba(10, 10, 20, 0.9)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(42, 45, 74, 0.5)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 flex-1">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(42, 45, 74, 0.5)' }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 8px rgba(217,119,87,0.3)',
                  '0 0 18px rgba(217,119,87,0.7)',
                  '0 0 8px rgba(217,119,87,0.3)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #D97757, #7C71F0)' }}
            >
              <span className="text-white font-bold text-sm select-none">N</span>
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

      {/* Center: page title on sub-pages */}
      {showBack && (
        <div className="flex-1 flex justify-center">
          <span className="text-text-primary font-semibold text-sm truncate max-w-[160px]">
            {title}
          </span>
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        {/* Backend status dot */}
        <div className="flex items-center gap-1.5 mr-1">
          <motion.div
            animate={backendStatus === 'online' ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-[10px] font-medium hidden sm:block" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>

        {/* Running tasks badge */}
        <AnimatePresence>
          {runningCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(217,119,87,0.15)',
                border: '1px solid rgba(217,119,87,0.35)',
                color: '#D97757',
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
              {runningCount} running
            </motion.div>
          )}
        </AnimatePresence>

        {/* Install PWA */}
        {showInstall && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleInstall}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{ background: 'rgba(124,113,240,0.15)', border: '1px solid rgba(124,113,240,0.3)' }}
            aria-label="Install app"
            title="Install NEXUS AI"
          >
            <Download size={16} style={{ color: '#7C71F0' }} />
          </motion.button>
        )}

        {/* Notification bell */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleNotifToggle}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{
            background: notifEnabled ? 'rgba(217,119,87,0.12)' : 'rgba(42,45,74,0.35)',
            border: notifEnabled ? '1px solid rgba(217,119,87,0.25)' : '1px solid transparent',
          }}
          aria-label={notifEnabled ? 'Notifications on' : 'Enable notifications'}
          title={notifEnabled ? 'Notifications enabled' : 'Enable notifications'}
        >
          {notifEnabled
            ? <Bell size={16} style={{ color: '#D97757' }} />
            : <BellOff size={16} className="text-text-muted" />
          }
        </motion.button>
      </div>
    </header>
  )
}
