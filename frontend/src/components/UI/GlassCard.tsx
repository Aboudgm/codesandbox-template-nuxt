import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: string
  onClick?: () => void
  padding?: boolean
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children, className = '', glow, onClick, padding = true,
}) => (
  <div
    className={`relative rounded-2xl transition-all duration-200 ${onClick ? 'cursor-pointer active:scale-[0.985]' : ''} ${padding ? 'p-4' : ''} ${className}`}
    style={{
      background: 'rgba(12,10,20,0.8)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: glow ? `1px solid ${glow}22` : '1px solid rgba(50,46,68,0.55)',
      boxShadow: glow ? `0 0 24px ${glow}14, 0 0 48px ${glow}06` : 'none',
    }}
    onClick={onClick}
  >
    {children}
  </div>
)
