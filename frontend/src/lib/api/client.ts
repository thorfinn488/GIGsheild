import { getStoredAuthToken } from '../auth/storage'

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
}

export function authHeader(): Record<string, string> {
  const token = getStoredAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function errorMessageFromResponse(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string | string[] | Record<string, unknown> }
    const d = data.detail
    if (typeof d === 'string') return d
    if (Array.isArray(d)) return d.map((x) => (typeof x === 'object' && x && 'msg' in x ? String((x as { msg: string }).msg) : String(x))).join(', ')
  } catch {
    /* ignore */
  }
  return fallback
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, { headers: authHeader() })
  if (!res.ok) throw new Error(await errorMessageFromResponse(res, `GET ${path} failed: ${res.status}`))
  return (await res.json()) as T
}

export async function apiPost<T>(path: string, body: unknown, bearerToken?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = bearerToken ?? getStoredAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await errorMessageFromResponse(res, `Request failed: ${res.status}`))
  return (await res.json()) as T
}
