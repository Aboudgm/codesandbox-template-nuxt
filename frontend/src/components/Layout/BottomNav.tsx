import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, List, Brain, Settings, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'

const NavItem: React.FC<{
  path: string
  label: string
  Icon: React.ElementType
  badge?: number
}> = ({ path, label, Icon, badge = 0 }) => (
  <NavLink to={path} end={path === '/'} className="flex-1 min-w-0">
    {({ isActive }) => (
      <div
        className="relative flex flex-col items-center justify-center gap-1 py-3 px-1"
        style={{ minHeight: '60px' }}
      >
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute inset-x-1.5 inset-y-1.5 rounded-xl"
            style={{
              background: 'rgba(217,119,87,0.12)',
              border: '1px solid rgba(217,119,87,0.22)',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}

        <div className="relative">
          <motion.div
            animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Icon
              size={21}
              style={{
                color: isActive ? '#D97757' : '#5A6080',
                filter: isActive ? 'drop-shadow(0 0 6px rgba(217,119,87,0.55))' : 'none',
                transition: 'all 0.2s',
              }}
            />
          </motion.div>

          <AnimatePresence>
            {badge > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#D97757', color: '#fff' }}
              >
                {badge > 9 ? '9+' : badge}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <span
          className="text-[10px] font-medium tracking-wide relative truncate"
          style={{
            color: isActive ? '#D97757' : '#5A6080',
            transition: 'color 0.2s',
          }}
        >
          {label}
        </span>
      </div>
    )}
  </NavLink>
)

export const BottomNav: React.FC = () => {
  const { setShowNewTask, tasks } = useAppStore()
  const activeCount = tasks.filter((t) => t.status === 'running' || t.status === 'pending').length

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="mx-3 mb-3 rounded-2xl border border-border/60"
        style={{
          background: 'rgba(14,14,26,0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow:
            '0 -2px 24px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(42,45,74,0.35)',
          overflow: 'visible',
        }}
      >
        <div className="flex items-stretch relative">
          <NavItem path="/" label="Home" Icon={Home} />
          <NavItem path="/tasks" label="Tasks" Icon={List} badge={activeCount} />

          {/* Center FAB */}
          <div className="flex-1 flex items-center justify-center" style={{ minWidth: 64 }}>
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.06 }}
              onClick={() => setShowNewTask(true)}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                width: 52,
                height: 52,
                bottom: 10,
                background: 'linear-gradient(135deg, #D97757 0%, #B85C38 100%)',
                boxShadow:
                  '0 4px 20px rgba(217,119,87,0.55), 0 0 0 3px rgba(14,14,26,0.95)',
              }}
              aria-label="New task"
            >
              <Plus size={24} color="#fff" strokeWidth={2.5} />
            </motion.button>
          </div>

          <NavItem path="/memory" label="Memory" Icon={Brain} />
          <NavItem path="/settings" label="Settings" Icon={Settings} />
        </div>
      </div>
    </nav>
  )
}
