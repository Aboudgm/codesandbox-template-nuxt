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
    className={`relative rounded-2xl transition-all duration-200 ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${padding ? 'p-4' : ''} ${className}`}
    style={{
      background: 'rgba(10,10,26,0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: glow ? `1px solid ${glow}25` : '1px solid rgba(30,32,64,0.7)',
      boxShadow: glow ? `0 0 24px ${glow}18, 0 0 48px ${glow}08` : 'none',
    }}
    onClick={onClick}
  >
    {children}
  </div>
)
