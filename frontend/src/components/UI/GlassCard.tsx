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
      background: 'rgba(22,22,30,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: glow ? `1px solid ${glow}28` : '1px solid rgba(255,255,255,0.055)',
      boxShadow: glow ? `0 0 28px ${glow}16, 0 0 56px ${glow}08` : 'none',
    }}
    onClick={onClick}
  >
    {children}
  </div>
)
