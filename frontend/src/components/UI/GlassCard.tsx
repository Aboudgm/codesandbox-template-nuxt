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
      background: 'rgba(22,22,30,0.90)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: glow
        ? `1px solid ${glow}22`
        : '1px solid rgba(255,255,255,0.055)',
      boxShadow: glow
        ? `0 0 24px ${glow}18, 0 0 48px ${glow}08`
        : '0 1px 3px rgba(0,0,0,0.3)',
    }}
    onClick={onClick}
  >
    {children}
  </div>
)
