import axios from 'axios'

/**
 * Extract a human-readable message from a FastAPI / Axios error response.
 * FastAPI returns { detail: string } for simple errors, or
 * { detail: ValidationError[] } for 422 validation failures.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const detail = error.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item: { msg?: string }) => item.msg)
      .filter(Boolean)
      .join('. ')
  }

  return fallback
}
