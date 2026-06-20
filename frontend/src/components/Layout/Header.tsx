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
    backendStatus === 'online'   ? '#2DD4BF' :
    backendStatus === 'offline'  ? '#EF6060' : '#F5C518'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgba(8,8,12,0.95)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderBottom: '1px solid rgba(232,112,64,0.08)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 flex-1">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-95"
            style={{
              background: 'rgba(232,112,64,0.07)',
              border: '1px solid rgba(232,112,64,0.16)',
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={16} style={{ color: '#E87040' }} />
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            {/* Logo orb */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 6px rgba(232,112,64,0.28)',
                  '0 0 20px rgba(232,112,64,0.60)',
                  '0 0 6px rgba(232,112,64,0.28)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(145deg, rgba(232,112,64,0.22), rgba(232,112,64,0.06))',
                border: '1px solid rgba(232,112,64,0.20)',
              }}
            >
              <span
                className="font-black text-[11px] select-none"
                style={{
                  background: 'linear-gradient(135deg, #F0A070, #E87040)',
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
                background: 'linear-gradient(135deg, #F0EEE8 10%, #E87040 55%, #9B8CE8 100%)',
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
          <span
            className="text-sm font-semibold truncate max-w-[160px]"
            style={{ color: '#F0F0F4' }}
          >
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
              ? { scale: [1, 1.5, 1], opacity: [0.9, 0.35, 0.9] }
              : backendStatus === 'checking'
              ? { opacity: [1, 0.4, 1] }
              : {}
            }
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        {/* Running tasks badge */}
        <AnimatePresence>
          {running > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(232,112,64,0.09)',
                border: '1px solid rgba(232,112,64,0.24)',
                color: '#E87040',
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#E87040' }}
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
            background: 'rgba(232,112,64,0.07)',
            border: '1px solid rgba(232,112,64,0.15)',
          }}
          aria-label="Command palette"
          title="Command palette (⌘K)"
        >
          <Command size={14} style={{ color: '#E87040' }} />
        </motion.button>

        {/* Notification bell */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleNotifToggle}
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
          style={{
            background: notifEnabled ? 'rgba(45,212,191,0.07)' : 'rgba(29,29,38,0.4)',
            border: notifEnabled ? '1px solid rgba(45,212,191,0.15)' : '1px solid transparent',
          }}
          aria-label={notifEnabled ? 'Notifications on' : 'Enable notifications'}
        >
          {notifEnabled
            ? <Bell size={14} style={{ color: '#2DD4BF' }} />
            : <BellOff size={14} style={{ color: '#33333C' }} />
          }
        </motion.button>
      </div>
    </header>
  )
}
