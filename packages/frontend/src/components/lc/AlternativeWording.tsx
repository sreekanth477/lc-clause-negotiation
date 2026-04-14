import React, { useState } from 'react'
import { CheckCircle, BookOpen } from 'lucide-react'
import type { AlternativeWording as AltWording } from '@lc-copilot/shared'

interface AlternativeWordingProps {
  alternatives: AltWording[]
  onSelect: (wording: string) => void
}

const tabLabel = (i: number) =>
  i === 0 ? 'Option A' : i === 1 ? 'Option B' : `Option ${String.fromCharCode(65 + i)}`

export const AlternativeWording: React.FC<AlternativeWordingProps> = ({
  alternatives,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState(0)

  if (!alternatives || alternatives.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No alternative wordings available.</p>
    )
  }

  const active = alternatives[activeTab]

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {alternatives.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              i === activeTab
                ? 'bg-white text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabLabel(i)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Proposed wording */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Proposed Wording
          </p>
          <p className="text-sm text-gray-800 bg-green-50 border border-green-200 rounded p-3 leading-relaxed">
            {active.wording}
          </p>
        </div>

        {/* Rationale */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Rationale
          </p>
          <p className="text-sm text-gray-700">{active.rationale}</p>
        </div>

        {/* UCP basis */}
        <div className="flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-[#1e3a5f] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#1e3a5f] font-medium">{active.ucpBasis}</p>
        </div>

        {/* Action */}
        <button
          type="button"
          onClick={() => onSelect(active.wording)}
          className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2d6a9f] text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Use This Wording
        </button>
      </div>
    </div>
  )
}
