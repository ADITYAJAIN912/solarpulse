import { type ReactNode, useRef, useState } from 'react'
import { motion, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Max tilt angle in degrees (default 8) */
  maxTilt?: number
  /** Glint highlight on mouse move */
  glint?: boolean
}

/**
 * 3D perspective tilt card — tracks mouse position within the element
 * and applies rotateX / rotateY.  Spring physics ensure the tilt settles
 * smoothly rather than snapping.  Used by award-winning products including
 * Linear, Raycast, and Framer.
 */
export default function TiltCard({
  children,
  className,
  maxTilt = 8,
  glint = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [glintPos, setGlintPos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  const rotateX = useSpring(0, { stiffness: 200, damping: 26 })
  const rotateY = useSpring(0, { stiffness: 200, damping: 26 })

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -maxTilt * 2
    const ry = ((e.clientX - rect.left) / rect.width - 0.5) * maxTilt * 2

    rotateX.set(rx)
    rotateY.set(ry)

    const gx = ((e.clientX - rect.left) / rect.width) * 100
    const gy = ((e.clientY - rect.top) / rect.height) * 100
    setGlintPos({ x: gx, y: gy })
  }

  function onMouseLeave() {
    rotateX.set(0)
    rotateY.set(0)
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={ref}
      className={cn('relative', className)}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 900,
      }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={onMouseLeave}
    >
      {children}

      {/* Glint highlight — follows mouse */}
      {glint && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(circle 200px at ${glintPos.x}% ${glintPos.y}%, rgba(255,255,255,0.55) 0%, transparent 70%)`,
          }}
          aria-hidden
        />
      )}
    </motion.div>
  )
}
