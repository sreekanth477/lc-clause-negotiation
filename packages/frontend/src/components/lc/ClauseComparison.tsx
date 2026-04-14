import React, { useMemo, useState } from 'react'
import DiffMatchPatch from 'diff-match-patch'

interface ClauseComparisonProps {
  originalText: string
  proposedText: string
}

const dmp = new DiffMatchPatch()

export const ClauseComparison: React.FC<ClauseComparisonProps> = ({
  originalText,
  proposedText,
}) => {
  const [showDiff, setShowDiff] = useState(true)

  const diffs = useMemo(() => {
    const d = dmp.diff_main(originalText, proposedText)
    dmp.diff_cleanupSemantic(d)
    return d
  }, [originalText, proposedText])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Clause Comparison</h4>
        <button
          type="button"
          onClick={() => setShowDiff((v) => !v)}
          className="text-xs text-[#1e3a5f] font-medium underline hover:no-underline"
        >
          {showDiff ? 'Show Clean' : 'Show Diff'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
        {showDiff ? (
          <>
            {diffs.map(([op, text], i) => {
              if (op === -1) {
                // DELETE
                return (
                  <span key={i} className="bg-red-100 line-through text-red-700">
                    {text}
                  </span>
                )
              } else if (op === 1) {
                // INSERT
                return (
                  <span key={i} className="bg-green-100 underline text-green-700">
                    {text}
                  </span>
                )
              } else {
                // EQUAL
                return (
                  <span key={i} className="text-gray-800">
                    {text}
                  </span>
                )
              }
            })}
          </>
        ) : (
          <span className="text-gray-800">{proposedText}</span>
        )}
      </div>
    </div>
  )
}
