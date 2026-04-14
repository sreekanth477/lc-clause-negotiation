import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfidenceScoreProps {
  score: number
}

export const ConfidenceScore: React.FC<ConfidenceScoreProps> = ({ score }) => {
  const pct = Math.round(score * 100)

  let barColor = 'bg-green-500'
  let textColor = 'text-green-700'
  if (score < 0.6) {
    barColor = 'bg-red-500'
    textColor = 'text-red-700'
  } else if (score < 0.8) {
    barColor = 'bg-amber-500'
    textColor = 'text-amber-700'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          AI Confidence
        </span>
        <span className={`text-sm font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {score < 0.7 && (
        <div className="flex items-center gap-1 mt-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Review Recommended
          </span>
        </div>
      )}
    </div>
  )
}
