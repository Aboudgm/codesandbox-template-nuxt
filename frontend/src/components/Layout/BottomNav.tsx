import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, List, Plus, Database, Settings } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface NavItem {
  path:  string
  icon:  React.ElementType
  label: string
}

const NAV: NavItem[] = [
  { path: '/',         icon: Home,     label: 'Home'     },
  { path: '/tasks',    icon: List,     label: 'Tasks'    },
  { path: '/memory',   icon: Database, label: 'Memory'   },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

const ACTIVE_COLOR = '#D97757'
const IDLE_COLOR   = '#38384A'

const Tab: React.FC<{ item: NavItem; active: boolean; badge?: number }> = ({ item, active, badge }) => {
  const navigate = useNavigate()
  const Icon = item.icon
  return (
    <button
      onClick={() => navigate(item.path)}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative"
      style={{ minHeight: 56 }}
    >
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
            style={{
              width: 28,
              background: ACTIVE_COLOR,
              boxShadow: `0 0 8px ${ACTIVE_COLOR}80`,
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          scale: active ? 1.08 : 1,
          y: active ? -1 : 0,
        }}
        transition={{ type: 'spring', damping: 22, stiffness: 420 }}
        style={{ color: active ? ACTIVE_COLOR : IDLE_COLOR, position: 'relative' }}
      >
        <Icon size={20} />
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
        style={{ color: active ? ACTIVE_COLOR : IDLE_COLOR }}
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
          background: 'rgba(8,8,16,0.97)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(217,119,87,0.1)',
          minHeight: 64,
        }}
      >
        <Tab item={NAV[0]} active={isActive('/')} />
        <Tab item={NAV[1]} active={isActive('/tasks')} badge={running} />

        {/* Center FAB */}
        <div className="flex items-center justify-center px-2" style={{ width: 72 }}>
          <motion.button
            whileTap={{ scale: 0.86 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => setShowNewTask(true)}
            className="w-13 h-13 rounded-2xl flex items-center justify-center relative"
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(145deg, #E08060 0%, #C4663E 100%)',
              boxShadow: '0 4px 20px rgba(217,119,87,0.55), 0 0 0 3px rgba(8,8,16,0.95)',
              marginTop: -16,
            }}
          >
            <Plus size={24} color="#fff" strokeWidth={2.5} />
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: 'rgba(217,119,87,0.45)' }}
            />
          </motion.button>
        </div>

        <Tab item={NAV[2]} active={isActive('/memory')} />
        <Tab item={NAV[3]} active={isActive('/settings')} />
      </div>
    </div>
  )
}
