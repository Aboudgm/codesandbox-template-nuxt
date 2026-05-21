import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: string // CSS color value for box-shadow glow
  onClick?: () => void
  padding?: boolean
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow,
  onClick,
  padding = true,
}) => {
  const glowStyle = glow
    ? { boxShadow: `0 0 20px ${glow}22, 0 0 40px ${glow}11, inset 0 1px 0 ${glow}22` }
    : {}

  return (
    <div
      className={`
        relative rounded-2xl
        bg-card/70 backdrop-blur-md
        border border-border/50
        transition-all duration-300
        ${onClick ? 'cursor-pointer active:scale-[0.98] hover:border-border' : ''}
        ${padding ? 'p-4' : ''}
        ${className}
      `}
      style={glowStyle}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
