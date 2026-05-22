import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, List, Plus, Database, Settings } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface NavItem {
  path:  string
  icon:  React.ReactNode
  label: string
}

const NAV: NavItem[] = [
  { path: '/',         icon: <Home      size={20} />, label: 'Home'     },
  { path: '/tasks',    icon: <List      size={20} />, label: 'Tasks'    },
  { path: '/memory',   icon: <Database  size={20} />, label: 'Memory'   },
  { path: '/settings', icon: <Settings  size={20} />, label: 'Settings' },
]

const Tab: React.FC<{ item: NavItem; active: boolean; badge?: number }> = ({ item, active, badge }) => {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(item.path)}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative"
      style={{ minHeight: 56 }}
    >
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="nav-bar"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
            style={{ background: '#00E5FF', boxShadow: '0 0 8px #00E5FF' }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{ scale: active ? 1.05 : 1, y: active ? -1 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 400 }}
        style={{ color: active ? '#00E5FF' : '#2A2A50', position: 'relative' }}
      >
        {item.icon}
        {badge && badge > 0 ? (
          <span
            className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: '#D97757', color: '#fff' }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </motion.div>

      <span
        className="text-[9px] font-semibold tracking-widest uppercase"
        style={{ color: active ? '#00E5FF' : '#2A2A50' }}
      >
        {item.label}
      </span>
    </button>
  )
}

export const BottomNav: React.FC = () => {
  const location = useLocation()
  const { tasks, setShowNewTask } = useAppStore()
  const running = tasks.filter((t) => t.status === 'running' || t.status === 'pending').length

  const isActive = (path: string) => {
    if (path === '/tasks') return location.pathname.startsWith('/tasks')
    return location.pathname === path
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="flex items-center"
        style={{
          background: 'rgba(5,5,15,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(0,229,255,0.08)',
          minHeight: 64,
        }}
      >
        <Tab item={NAV[0]} active={isActive('/')} />
        <Tab item={NAV[1]} active={isActive('/tasks')} badge={running} />

        {/* Center FAB */}
        <div className="flex items-center justify-center px-3" style={{ width: 76 }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowNewTask(true)}
            className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, #D97757 0%, #B85C38 100%)',
              boxShadow: '0 4px 24px rgba(217,119,87,0.5), 0 0 0 3px rgba(5,5,15,0.95)',
              marginTop: -18,
            }}
          >
            <Plus size={26} color="#fff" strokeWidth={2.5} />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: 'rgba(217,119,87,0.5)' }}
            />
          </motion.button>
        </div>

        <Tab item={NAV[2]} active={isActive('/memory')} />
        <Tab item={NAV[3]} active={isActive('/settings')} />
      </div>
    </div>
  )
}
