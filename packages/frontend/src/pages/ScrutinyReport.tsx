import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, Printer } from 'lucide-react'
import { api } from '../api/client'
import { ScrutinyReportViewer } from '../components/report/ScrutinyReportViewer'
import { ExportButtons } from '../components/report/ExportButtons'
import type { ScrutinyReport as ScrutinyReportType } from '@lc-copilot/shared'

export const ScrutinyReport: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [report, setReport] = useState<ScrutinyReportType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    const fetchReport = async () => {
      setLoading(true)
      try {
        const data = await api.lc.getReport(sessionId)
        setReport(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load report.')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [sessionId])

  const allHighActioned = report
    ? report.clauses
        .filter((c) => c.riskLevel === 'HIGH')
        .every((c) => c.decision || c.isEscalated)
    : false

  const handleComplete = async () => {
    if (!sessionId) return
    setCompleting(true)
    try {
      await api.lc.completeSession(sessionId)
      setCompleted(true)
    } catch {
      // Handle error
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3 text-red-600">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="max-w-4xl mx-auto print:max-w-none space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between print:hidden flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate(`/lc/${sessionId}/review`)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1e3a5f] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Review
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-2 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <ExportButtons
            sessionId={sessionId ?? ''}
            referenceNumber={report.referenceNumber}
          />

          <button
            type="button"
            onClick={handleComplete}
            disabled={!allHighActioned || completed || completing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {completing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {completed ? 'Session Completed' : 'Mark Session Complete'}
          </button>
        </div>
      </div>

      {!allHighActioned && !completed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          All HIGH risk clauses must be actioned before marking the session complete.
        </div>
      )}

      {/* Report document */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 print:border-none print:shadow-none">
        {/* Report title */}
        <div className="mb-6 pb-5 border-b border-gray-200">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#1e3a5f]">
                LC Scrutiny Report
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Reference: <span className="font-mono font-semibold text-gray-700">{report.referenceNumber}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Applicant: <strong>{report.applicantName}</strong>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                By: {report.generatedBy}
              </p>
            </div>
          </div>
        </div>

        <ScrutinyReportViewer report={report} />
      </div>
    </div>
  )
}
