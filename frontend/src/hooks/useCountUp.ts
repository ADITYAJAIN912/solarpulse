import { animate } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * Animates a number from 0 to `target` on mount (or when target changes).
 * Uses a spring-like ease that overshoots slightly then settles — the same
 * easing used by Stripe's and Linear's metric counters.
 */
export function useCountUp(
  target: number,
  options?: { duration?: number; enabled?: boolean },
): number {
  const { duration = 1.1, enabled = true } = options ?? {}
  const [value, setValue] = useState(enabled ? 0 : target)

  useEffect(() => {
    if (!enabled || target === 0) {
      setValue(target)
      return
    }

    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    })

    return () => controls.stop()
  }, [target, duration, enabled])

  return value
}
