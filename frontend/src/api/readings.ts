import client from './client'
import type {
  ExpectedOutputByHour,
  ReadingsUploadPayload,
  ReadingsUploadResult,
} from '../types'

/** Fetch auto-calculated expected kWh for each daylight hour on a given date. */
export async function getExpectedOutput(
  plantId: number,
  date: string,
): Promise<ExpectedOutputByHour> {
  const { data } = await client.get<ExpectedOutputByHour>(
    `/plants/${plantId}/readings/expected`,
    { params: { date } },
  )
  return data
}

/** Submit manual / paste readings as JSON. */
export async function uploadReadingsJson(
  plantId: number,
  payload: ReadingsUploadPayload,
): Promise<ReadingsUploadResult> {
  const { data } = await client.post<ReadingsUploadResult>(
    `/plants/${plantId}/readings`,
    payload,
  )
  return data
}

/** Upload a CSV file. */
export async function uploadReadingsCsv(
  plantId: number,
  file: File,
  overwrite: boolean,
): Promise<ReadingsUploadResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<ReadingsUploadResult>(
    `/plants/${plantId}/readings/upload`,
    form,
    {
      params: { overwrite },
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return data
}

/** Download the pre-filled CSV template. */
export function getTemplateUrl(plantId: number, date: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const token = localStorage.getItem('token') ?? ''
  // Template download needs auth — we open it via a fetch+blob trick in the component.
  // This function just builds the URL for convenience.
  return `${base}/plants/${plantId}/readings/template?date=${date}&token=${token}`
}

export async function downloadTemplate(plantId: number, date: string): Promise<void> {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const token = localStorage.getItem('token') ?? ''
  const res = await fetch(
    `${base}/plants/${plantId}/readings/template?date=${date}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error('Failed to download template')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `solarpulse_template_${plantId}_${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
