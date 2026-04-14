import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, AlertTriangle, Clock, Activity } from 'lucide-react'
import { api } from '../api/client'
import { StatusIndicator } from '../components/shared/StatusIndicator'
import { RiskBadge } from '../components/shared/RiskBadge'
import { RiskLevel } from '@lc-copilot/shared'
import type { LCSession, User } from '../api/client'

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('lc_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [sessions, setSessions] = useState<LCSession[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true)
      try {
        const result = await api.lc.getSessions({ limit: 50 })
        setSessions(result.sessions)
        setTotal(result.total)
      } catch {
        setError('Failed to load sessions.')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  const activeCount = sessions.filter(
    (s) => s.status === 'IN_REVIEW' || s.status === 'PARSING'
  ).length
  const highRiskCount = sessions.reduce(
    (acc, s) => acc + (s.riskCounts?.HIGH ?? 0),
    0
  )
  const pendingCount = sessions.filter((s) => s.status === 'IN_REVIEW').length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome banner */}
      <div className="bg-[#1e3a5f] text-white rounded-xl px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Welcome back, {user?.name ?? 'Officer'}</h1>
          <p className="text-blue-200 text-sm mt-0.5">
            LC Clause Negotiation AI Copilot
          </p>
        </div>
        <button
          onClick={() => navigate('/lc/new')}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Start New LC Review
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{activeCount}</p>
            <p className="text-sm text-gray-500">Active Reviews</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{highRiskCount}</p>
            <p className="text-sm text-gray-500">High Risk Flags</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pending Decisions</p>
          </div>
        </div>
      </div>

      {/* Sessions table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            LC Sessions{total > 0 && <span className="ml-2 text-gray-400 text-sm font-normal">({total})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-40" />
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-sm text-red-500">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-500 text-sm">No LC sessions yet.</p>
            <button
              onClick={() => navigate('/lc/new')}
              className="mt-3 text-sm text-[#1e3a5f] font-medium underline hover:no-underline"
            >
              Start your first review
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Reference</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Applicant</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Risk</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Created</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-[#1e3a5f] font-semibold">
                      {session.referenceNumber}
                    </td>
                    <td className="px-5 py-3 text-gray-800">{session.applicantName}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {session.lcType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-3">
                      <StatusIndicator status={session.status} />
                    </td>
                    <td className="px-5 py-3">
                      {session.riskCounts ? (
                        <div className="flex items-center gap-1">
                          {session.riskCounts.HIGH > 0 && (
                            <span className="text-xs font-bold text-red-600">
                              {session.riskCounts.HIGH}H
                            </span>
                          )}
                          {session.riskCounts.MEDIUM > 0 && (
                            <span className="text-xs font-bold text-amber-600">
                              {session.riskCounts.MEDIUM}M
                            </span>
                          )}
                          {session.riskCounts.LOW > 0 && (
                            <span className="text-xs font-bold text-yellow-600">
                              {session.riskCounts.LOW}L
                            </span>
                          )}
                          {session.riskCounts.HIGH === 0 &&
                            session.riskCounts.MEDIUM === 0 &&
                            session.riskCounts.LOW === 0 && (
                              <RiskBadge riskLevel={RiskLevel.COMPLIANT} size="sm" />
                            )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => navigate(`/lc/${session.id}/review`)}
                        className="inline-flex items-center gap-1.5 text-xs text-[#1e3a5f] font-medium border border-[#1e3a5f] px-2.5 py-1.5 rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
