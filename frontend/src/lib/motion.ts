import type { Transition, Variants } from 'framer-motion'

/** Shared easing — quick ease-out, editorial style */
export const easeOut: Transition['ease'] = [0, 0, 0.2, 1]
export const easeInOut: Transition['ease'] = [0.4, 0, 0.2, 1]

export const pageEntrance = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: easeOut },
} as const

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.07 },
  },
}

export const fadeInUpVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: easeOut },
  },
}

/**
 * Blur-in variant — value appears from soft focus to sharp.
 * Used for KPI metric values so numbers feel like they load in
 * rather than snapping into place.
 */
export const blurInVariants: Variants = {
  initial: { opacity: 0, filter: 'blur(6px)', y: 4 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: 0.4, ease: easeOut },
  },
}

export const slideDownFadeVariants: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.2, ease: easeOut },
  },
}

export const contentFadeVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
}

export const cardHoverTransition: Transition = {
  duration: 0.22,
  ease: easeOut,
}
