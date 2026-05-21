import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, List, Brain, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

interface NavItem {
  path: string
  label: string
  Icon: React.ElementType
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', Icon: Home },
  { path: '/tasks', label: 'Tasks', Icon: List },
  { path: '/memory', label: 'Memory', Icon: Brain },
  { path: '/settings', label: 'Settings', Icon: Settings },
]

export const BottomNav: React.FC = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Glass background */}
      <div
        className="mx-3 mb-3 rounded-2xl border border-border/60 overflow-hidden"
        style={{
          background: 'rgba(18, 18, 31, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(42,45,74,0.3)',
        }}
      >
        <div className="flex items-stretch">
          {navItems.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className="flex-1"
            >
              {({ isActive }) => (
                <div
                  className="relative flex flex-col items-center justify-center gap-1 py-3 px-2 transition-all duration-200 touch-target"
                  style={{ minHeight: '60px' }}
                >
                  {/* Active indicator pill */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-x-2 inset-y-1.5 rounded-xl"
                      style={{
                        background: 'rgba(217, 119, 87, 0.12)',
                        border: '1px solid rgba(217, 119, 87, 0.2)',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      y: isActive ? -1 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="relative"
                  >
                    <Icon
                      size={22}
                      style={{
                        color: isActive ? '#D97757' : '#5A6080',
                        filter: isActive ? 'drop-shadow(0 0 6px rgba(217,119,87,0.6))' : 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                  </motion.div>

                  <span
                    className="text-[10px] font-medium tracking-wide relative"
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
          ))}
        </div>
      </div>
    </nav>
  )
}
