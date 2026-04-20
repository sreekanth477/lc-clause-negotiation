import { useState, useRef, useCallback } from 'react'
import { useLCStore } from '../store/lcStore'
import type { ClauseAnalysisSSEEvent } from '@lc-copilot/shared'

interface UseClauseReviewResult {
  startAnalysis: () => void
  isAnalysing: boolean
  progress: { total: number; completed: number; status: string }
}

export function useClauseReview(sessionId: string): UseClauseReviewResult {
  const { updateClauseAnalysis, setAnalysisProgress, analysisProgress, clauses } = useLCStore()
  const [isAnalysing, setIsAnalysing] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  const startAnalysis = useCallback(() => {
    if (isAnalysing) return

    // Close any existing connection
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const token = localStorage.getItem('lc_token') ?? ''
    const url = `/api/lc/sessions/${sessionId}/analyse?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es

    setIsAnalysing(true)
    setAnalysisProgress({ status: 'analysing', total: clauses.length, completed: 0 })

    es.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as
          | ClauseAnalysisSSEEvent
          | { type: 'COMPLETE' }
          | { type: 'PROGRESS'; total: number; completed: number }

        if ('type' in data) {
          if (data.type === 'COMPLETE') {
            setIsAnalysing(false)
            setAnalysisProgress({ status: 'complete' })
            es.close()
            esRef.current = null
          } else if (data.type === 'PROGRESS') {
            setAnalysisProgress({
              total: data.total,
              completed: data.completed,
              status: 'analysing',
            })
          }
        } else {
          // ClauseAnalysisSSEEvent
          const evt = data as ClauseAnalysisSSEEvent
          updateClauseAnalysis(evt.clauseId, evt.analysis, evt.alternatives)
          setAnalysisProgress({
            completed: (analysisProgress?.completed ?? 0) + 1,
            status: 'analysing',
          })
        }
      } catch {
        // Ignore parse errors
      }
    }

    es.onerror = () => {
      setIsAnalysing(false)
      setAnalysisProgress({ status: 'error' })
      es.close()
      esRef.current = null
    }
  }, [sessionId, isAnalysing, clauses.length, updateClauseAnalysis, setAnalysisProgress])

  return { startAnalysis, isAnalysing, progress: analysisProgress }
}
