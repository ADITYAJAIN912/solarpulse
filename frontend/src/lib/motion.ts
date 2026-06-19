import type { Transition, Variants } from 'framer-motion'

/** Shared easing — quick ease-out, Linear/Vercel style */
export const easeOut: Transition['ease'] = [0, 0, 0.2, 1]

export const pageEntrance = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: easeOut },
} as const

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

export const fadeInUpVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: easeOut },
  },
}

export const slideDownFadeVariants: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -4,
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
  duration: 0.2,
  ease: easeOut,
}
