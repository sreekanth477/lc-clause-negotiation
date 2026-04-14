import React, { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { ClauseWithAnalysis, LCSessionDetail } from '../../api/client'

interface NegotiationNoteProps {
  clause: ClauseWithAnalysis
  session: LCSessionDetail
  onClose: () => void
}

function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatClauseType(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildNote(clause: ClauseWithAnalysis, session: LCSessionDetail): string {
  const alt = clause.alternatives?.[0]
  const finding = clause.findings?.[0]
  const ucp = clause.ucpArticles?.[0] ?? 'UCP 600'
  const riskLevel = clause.riskLevel ?? 'N/A'
  const deadline = addDays(7)

  return `RE: LC Reference ${session.referenceNumber} — Clause Amendment Request

Dear ${session.applicantName},

We have reviewed the above-referenced Letter of Credit and wish to draw your attention to the following clause that requires amendment before we can process the LC in accordance with our operational guidelines and UCP 600 rules.

CLAUSE: ${formatClauseType(clause.clauseType)} — Risk Level: ${riskLevel}

CONCERN: ${finding?.issue ?? 'This clause presents compliance concerns under UCP 600.'}

${finding?.explanation ? `DETAIL: ${finding.explanation}\n` : ''}
PROPOSED AMENDMENT:
${alt?.wording ?? '[Please provide amended wording]'}

BASIS: ${ucp}${alt?.ucpBasis ? ` — ${alt.ucpBasis}` : ''}

ACTION REQUIRED: Please confirm your acceptance of the proposed amendment and provide a formal written confirmation by ${deadline}.

Should you have any questions or wish to discuss the proposed amendment, please do not hesitate to contact your Relationship Manager.

Yours faithfully,
Trade Finance Operations`
}

export const NegotiationNote: React.FC<NegotiationNoteProps> = ({
  clause,
  session,
  onClose,
}) => {
  const [copied, setCopied] = useState(false)
  const note = buildNote(clause, session)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(note)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Negotiation Note</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-4">
            {note}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d6a9f] text-white text-sm font-medium rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
