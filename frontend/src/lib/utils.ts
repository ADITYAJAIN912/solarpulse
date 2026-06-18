import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn() — shadcn/ui's canonical helper for merging Tailwind class strings.
 *
 * Combines clsx (conditional class names) with tailwind-merge (which
 * de-duplicates conflicting Tailwind utilities, e.g. "p-2 p-4" → "p-4").
 * Every component should use this instead of raw string concatenation.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
