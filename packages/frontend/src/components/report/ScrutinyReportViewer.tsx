import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { RiskBadge } from '../shared/RiskBadge'
import { RiskLevel } from '@lc-copilot/shared'
import type { ScrutinyReport } from '@lc-copilot/shared'

interface ScrutinyReportViewerProps {
  report: ScrutinyReport
}

const riskCardConfig = [
  { level: RiskLevel.HIGH, label: 'High Risk', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', count: (r: ScrutinyReport) => r.riskCounts.HIGH },
  { level: RiskLevel.MEDIUM, label: 'Medium Risk', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', count: (r: ScrutinyReport) => r.riskCounts.MEDIUM },
  { level: RiskLevel.LOW, label: 'Low Risk', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', count: (r: ScrutinyReport) => r.riskCounts.LOW },
  { level: RiskLevel.COMPLIANT, label: 'Compliant', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', count: (r: ScrutinyReport) => r.riskCounts.COMPLIANT },
]

function formatClauseType(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export const ScrutinyReportViewer: React.FC<ScrutinyReportViewerProps> = ({ report }) => {
  const [tableExpanded, setTableExpanded] = useState(true)

  return (
    <div className="space-y-6">
      {/* Risk summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {riskCardConfig.map(({ label, bg, border, text, count }) => (
          <div key={label} className={`${bg} ${border} border rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-bold ${text}`}>{count(report)}</p>
            <p className={`text-sm font-medium ${text} mt-1`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Executive Summary */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">Executive Summary</h3>
        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-4">
          {report.executiveSummary}
        </p>
      </section>

      {/* Key Risk Findings */}
      {report.keyRiskFindings.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-800 mb-2">Key Risk Findings</h3>
          <ul className="space-y-2">
            {report.keyRiskFindings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {finding}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recommended Actions */}
      {report.recommendedActions.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-800 mb-2">Recommended Actions</h3>
          <ul className="space-y-2">
            {report.recommendedActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-[#1e3a5f] text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Compliance Notes */}
      {report.complianceNotes && (
        <section>
          <h3 className="text-base font-semibold text-gray-800 mb-2">Compliance Notes</h3>
          <p className="text-sm text-gray-700 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
            {report.complianceNotes}
          </p>
        </section>
      )}

      {/* Clause Table */}
      <section>
        <button
          type="button"
          onClick={() => setTableExpanded((v) => !v)}
          className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-3 hover:text-[#1e3a5f] transition-colors"
        >
          {tableExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Clause Detail Table ({report.clauses.length} clauses)
        </button>

        {tableExpanded && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 w-10">#</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Risk</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Finding</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.clauses.map((clause) => (
                  <tr key={clause.clauseIndex} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-500">{clause.clauseIndex + 1}</td>
                    <td className="px-3 py-3 text-gray-700 font-medium">
                      {formatClauseType(clause.clauseType)}
                    </td>
                    <td className="px-3 py-3">
                      <RiskBadge riskLevel={clause.riskLevel} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-gray-600 max-w-xs">
                      <p className="line-clamp-2">
                        {clause.findings[0]?.issue ?? '—'}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {clause.decision ? (
                        <span className="inline-block text-xs bg-green-100 text-green-700 border border-green-200 rounded px-1.5 py-0.5 font-medium">
                          {clause.decision.decision.replace(/_/g, ' ')}
                        </span>
                      ) : clause.isEscalated ? (
                        <span className="inline-block text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5 font-medium">
                          Escalated
                        </span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
