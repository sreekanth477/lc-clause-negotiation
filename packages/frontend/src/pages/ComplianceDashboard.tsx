import React, { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ShieldOff, Loader2, Check, X } from 'lucide-react'
import { UserRole } from '@lc-copilot/shared'
import { api } from '../api/client'
import { RiskBadge } from '../components/shared/RiskBadge'
import type { ComplianceDashboardData, EscalationItem } from '@lc-copilot/shared'
import type { User } from '../api/client'

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('lc_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function formatClauseType(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

interface ResolveModalState {
  item: EscalationItem
  resolution: string
  notes: string
  submitting: boolean
}

export const ComplianceDashboard: React.FC = () => {
  const user = getStoredUser()

  const [data, setData] = useState<ComplianceDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolveModal, setResolveModal] = useState<ResolveModalState | null>(null)
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user?.role === UserRole.TRADE_RM) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await api.compliance.getDashboard()
        setData(result)
      } catch {
        setError('Failed to load compliance dashboard.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.role])

  const handleResolve = async () => {
    if (!resolveModal) return
    setResolveModal((prev) => prev && { ...prev, submitting: true })
    try {
      await api.compliance.resolveEscalation(resolveModal.item.clauseId, {
        resolution: resolveModal.resolution,
        notes: resolveModal.notes,
      })
      setResolvedIds((prev) => new Set(prev).add(resolveModal.item.clauseId))
      setResolveModal(null)
    } catch {
      setResolveModal((prev) => prev && { ...prev, submitting: false })
    }
  }

  // Access denied
  if (user?.role === UserRole.TRADE_RM) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <ShieldOff className="w-12 h-12 text-gray-300" />
        <div>
          <p className="text-base font-semibold text-gray-700">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1">
            You don't have permission to view the Compliance Dashboard.
          </p>
        </div>
      </div>
    )
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
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 text-sm">
        {error}
      </div>
    )
  }

  if (!data) return null

  const { escalations, riskStats, feedbackSummary, aiPerformanceMetrics: metrics } = data
  const pendingEscalations = escalations.filter((e) => !resolvedIds.has(e.clauseId))

  const feedbackChartData = [
    { name: 'Helpful', count: feedbackSummary.HELPFUL, fill: '#22c55e' },
    { name: 'Partial', count: feedbackSummary.PARTIALLY_HELPFUL, fill: '#f59e0b' },
    { name: 'Not Helpful', count: feedbackSummary.NOT_HELPFUL, fill: '#ef4444' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Compliance Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI performance metrics, escalations, and risk trends
        </p>
      </div>

      {/* Section 1: AI Performance Metrics */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">AI Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Avg Confidence',
              value: `${Math.round(metrics.averageConfidenceScore * 100)}%`,
              sub: `${metrics.totalAnalyses} analyses`,
              color: 'text-[#1e3a5f]',
              bg: 'bg-blue-50',
            },
            {
              label: 'Acceptance Rate',
              value: `${Math.round(metrics.acceptanceRate * 100)}%`,
              sub: 'AI suggestions accepted',
              color: 'text-green-700',
              bg: 'bg-green-50',
            },
            {
              label: 'Edit Rate',
              value: `${Math.round(metrics.editRate * 100)}%`,
              sub: 'suggestions edited',
              color: 'text-amber-700',
              bg: 'bg-amber-50',
            },
            {
              label: 'Rejection Rate',
              value: `${Math.round(metrics.rejectionRate * 100)}%`,
              sub: 'officer wrote own',
              color: 'text-red-700',
              bg: 'bg-red-50',
            },
          ].map(({ label, value, sub, color, bg }) => (
            <div key={label} className={`${bg} border border-gray-200 rounded-xl p-5`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Escalation Queue */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Escalation Queue
          {pendingEscalations.length > 0 && (
            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
              {pendingEscalations.length} pending
            </span>
          )}
        </h2>

        {pendingEscalations.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-8 text-center">
            <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-green-700 font-medium">No pending escalations</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Reference</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Applicant</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Clause</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Risk</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Note</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Officer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingEscalations.map((item) => (
                    <tr key={item.clauseId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-[#1e3a5f] font-semibold">
                        {item.referenceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{item.applicantName}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatClauseType(item.clauseType)}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge riskLevel={item.riskLevel} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
                        <p className="line-clamp-2 text-xs">{item.escalationNote}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{item.officerName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(item.escalatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setResolveModal({
                              item,
                              resolution: '',
                              notes: '',
                              submitting: false,
                            })
                          }
                          className="text-xs text-[#1e3a5f] font-medium border border-[#1e3a5f] px-2.5 py-1.5 rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Risk Trend Chart */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Risk Trend</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {riskStats.riskTrend.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No trend data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={riskStats.riskTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                  }
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="HIGH" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="MEDIUM" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="LOW" stroke="#eab308" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Section 4: Feedback Summary */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Feedback Summary</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {feedbackSummary.total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No feedback collected yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={feedbackChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {feedbackChartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 justify-center mt-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              Helpful: {feedbackSummary.HELPFUL}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              Partial: {feedbackSummary.PARTIALLY_HELPFUL}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              Not Helpful: {feedbackSummary.NOT_HELPFUL}
            </span>
          </div>
        </div>
      </section>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-800">Resolve Escalation</h3>
              <button
                type="button"
                onClick={() => setResolveModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                  Original Escalation Note
                </p>
                <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  {resolveModal.item.escalationNote}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                  Resolution <span className="text-red-500">*</span>
                </label>
                <select
                  value={resolveModal.resolution}
                  onChange={(e) =>
                    setResolveModal((prev) => prev && { ...prev, resolution: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="">Select resolution...</option>
                  <option value="APPROVED">Approved — proceed as proposed</option>
                  <option value="REJECTED">Rejected — return to officer</option>
                  <option value="AMENDED">Amended — with modifications</option>
                  <option value="WAIVED">Waived — exception granted</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                  Notes
                </label>
                <textarea
                  value={resolveModal.notes}
                  onChange={(e) =>
                    setResolveModal((prev) => prev && { ...prev, notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Add any notes for the officer..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setResolveModal(null)}
                className="text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={!resolveModal.resolution || resolveModal.submitting}
                className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2d6a9f] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {resolveModal.submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
