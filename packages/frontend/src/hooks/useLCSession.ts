import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useLCStore } from '../store/lcStore'
import type { LCSessionDetail } from '../api/client'

interface UseLCSessionResult {
  session: LCSessionDetail | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useLCSession(sessionId?: string): UseLCSessionResult {
  const { setCurrentSession } = useLCStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<LCSessionDetail | null>(null)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!sessionId) return

    let cancelled = false

    const fetchSession = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.lc.getSession(sessionId)
        if (!cancelled) {
          setSession(data)
          setCurrentSession(data)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : 'Failed to load session'
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSession()

    return () => {
      cancelled = true
    }
  }, [sessionId, version, setCurrentSession])

  return { session, loading, error, refetch }
}
