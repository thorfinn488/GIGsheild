import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getStoredAuthToken } from '../lib/auth/storage'

export function RequireAuth({ children }: { children: ReactNode }) {
  if (!getStoredAuthToken()) return <Navigate to="/onboard" replace />
  return <>{children}</>
}
