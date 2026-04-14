import React from 'react'
import { AlertTriangle, ArrowUp, CheckCircle } from 'lucide-react'
import { RiskBadge } from '../shared/RiskBadge'
import type { ClauseWithAnalysis } from '../../api/client'

interface ClauseCardProps {
  clause: ClauseWithAnalysis
  isActive: boolean
  onClick: () => void
}

const typeLabel = (t: string) =>
  t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

export const ClauseCard: React.FC<ClauseCardProps> = ({ clause, isActive, onClick }) => {
  const hasDecision = !!clause.decision
  const isEscalated = !!clause.isEscalated

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-lg border transition-all ${
        isActive
          ? 'border-[#1e3a5f] bg-blue-50 shadow-sm'
          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Index badge */}
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
            isActive ? 'bg-[#1e3a5f] text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {clause.clauseIndex + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-700 truncate">
              {typeLabel(clause.clauseType)}
            </span>
            {clause.isSoftClause && (
              <AlertTriangle
                className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"
                title="Soft clause"
              />
            )}
            {isEscalated && (
              <ArrowUp
                className="w-3.5 h-3.5 text-orange-500 flex-shrink-0"
                title="Escalated"
              />
            )}
            {hasDecision && (
              <CheckCircle
                className="w-3.5 h-3.5 text-green-500 flex-shrink-0"
                title="Actioned"
              />
            )}
          </div>

          {clause.riskLevel ? (
            <div className="mt-1">
              <RiskBadge riskLevel={clause.riskLevel} size="sm" />
            </div>
          ) : (
            <span className="inline-block mt-1 text-xs text-gray-400 italic">
              Not analysed
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
