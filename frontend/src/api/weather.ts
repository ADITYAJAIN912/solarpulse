/**
 * Open-Meteo weather API client.
 *
 * Why Open-Meteo?
 *  - Completely free, no API key required
 *  - CORS-enabled — safe to call directly from the browser
 *  - Provides solar-critical metrics: cloud cover, UV index, direct solar radiation
 *  - Returns WMO standard weather codes that map cleanly to human-readable conditions
 *
 * Docs: https://open-meteo.com/en/docs
 */

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

// WMO Weather interpretation codes → human labels + icon slug
const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Clear Sky',        icon: 'sun' },
  1:  { label: 'Mainly Clear',     icon: 'sun' },
  2:  { label: 'Partly Cloudy',    icon: 'cloud-sun' },
  3:  { label: 'Overcast',         icon: 'cloud' },
  45: { label: 'Fog',              icon: 'fog' },
  48: { label: 'Icy Fog',          icon: 'fog' },
  51: { label: 'Light Drizzle',    icon: 'rain' },
  53: { label: 'Drizzle',          icon: 'rain' },
  55: { label: 'Heavy Drizzle',    icon: 'rain' },
  61: { label: 'Light Rain',       icon: 'rain' },
  63: { label: 'Rain',             icon: 'rain' },
  65: { label: 'Heavy Rain',       icon: 'rain' },
  71: { label: 'Light Snow',       icon: 'snow' },
  73: { label: 'Snow',             icon: 'snow' },
  75: { label: 'Heavy Snow',       icon: 'snow' },
  80: { label: 'Rain Showers',     icon: 'rain' },
  81: { label: 'Rain Showers',     icon: 'rain' },
  82: { label: 'Violent Showers',  icon: 'rain' },
  95: { label: 'Thunderstorm',     icon: 'storm' },
  96: { label: 'Thunderstorm',     icon: 'storm' },
  99: { label: 'Thunderstorm',     icon: 'storm' },
}

export interface WeatherData {
  temperature: number        // °C
  feelsLike: number          // °C
  humidity: number           // %
  cloudCover: number         // % (0 = clear, 100 = full overcast)
  windSpeed: number          // km/h
  uvIndex: number            // 0–11+
  weatherCode: number
  weatherLabel: string
  weatherIcon: string        // icon slug
  sunrise: string            // ISO datetime
  sunset: string             // ISO datetime
  uvIndexMax: number
  solarImpact: 'excellent' | 'good' | 'moderate' | 'poor'
  solarImpactLabel: string
  updatedAt: string          // ISO datetime from API
}

/** Derive a solar generation impact rating from cloud cover and UV index. */
function deriveSolarImpact(cloudCover: number, uvIndex: number): WeatherData['solarImpact'] {
  if (cloudCover <= 15 && uvIndex >= 7) return 'excellent'
  if (cloudCover <= 35 && uvIndex >= 5) return 'good'
  if (cloudCover <= 65)                 return 'moderate'
  return 'poor'
}

function solarImpactLabel(impact: WeatherData['solarImpact']): string {
  switch (impact) {
    case 'excellent': return 'Excellent solar conditions'
    case 'good':      return 'Good solar conditions'
    case 'moderate':  return 'Moderate solar conditions'
    case 'poor':      return 'Poor solar conditions — cloud cover impacting output'
  }
}

/**
 * Derive an approximate climate zone label from coordinates + temperature.
 * Uses broad regional heuristics — accurate enough for display purposes.
 */
export function deriveClimateZone(lat: number, lon: number, temperature: number): string {
  // Indian subcontinent zones
  if (lat >= 24 && lat <= 32 && lon >= 68 && lon <= 77) return 'Hot Arid'
  if (lat >= 18 && lat <= 24 && lon >= 72 && lon <= 85) return 'Semi-Arid'
  if (lat < 18 && lon > 70)                              return 'Tropical'
  if (lat > 32)                                          return 'Continental'
  // Global temperature-based fallback
  if (temperature >= 35) return 'Hot Arid'
  if (temperature >= 28) return 'Semi-Arid'
  if (temperature >= 20) return 'Tropical'
  return 'Temperate'
}

/**
 * Estimate daily Global Horizontal Irradiance (kWh/m²) from UV index max.
 * This is an approximation based on the strong correlation between GHI and UV.
 */
export function estimateGHI(uvIndexMax: number, sunriseIso: string, sunsetIso: string): number {
  const solarHours = (new Date(sunsetIso).getTime() - new Date(sunriseIso).getTime()) / 3_600_000
  const ghi = (uvIndexMax * solarHours * 0.065)
  return Math.round(ghi * 10) / 10
}

/** Fetch plant elevation (metres ASL) from Open-Meteo's elevation endpoint. */
export async function getElevation(latitude: number, longitude: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`
    )
    if (!res.ok) return null
    const json = await res.json()
    return Math.round(json.elevation?.[0] ?? null)
  } catch {
    return null
  }
}

export async function getWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude:  String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'weather_code',
      'cloud_cover',
      'wind_speed_10m',
      'uv_index',
    ].join(','),
    daily:    'sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: '1',
  })

  const res = await fetch(`${BASE_URL}?${params}`)
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`)

  const json = await res.json()
  const c = json.current

  const code        = c.weather_code as number
  const cloudCover  = c.cloud_cover as number
  const uvIndex     = c.uv_index as number
  const wmo         = WMO_CODES[code] ?? { label: 'Unknown', icon: 'cloud' }
  const impact      = deriveSolarImpact(cloudCover, uvIndex)

  return {
    temperature:      Math.round(c.temperature_2m),
    feelsLike:        Math.round(c.apparent_temperature),
    humidity:         c.relative_humidity_2m,
    cloudCover,
    windSpeed:        Math.round(c.wind_speed_10m),
    uvIndex:          Math.round(uvIndex * 10) / 10,
    weatherCode:      code,
    weatherLabel:     wmo.label,
    weatherIcon:      wmo.icon,
    sunrise:          json.daily.sunrise[0],
    sunset:           json.daily.sunset[0],
    uvIndexMax:       json.daily.uv_index_max[0],
    solarImpact:      impact,
    solarImpactLabel: solarImpactLabel(impact),
    updatedAt:        c.time,
  }
}
