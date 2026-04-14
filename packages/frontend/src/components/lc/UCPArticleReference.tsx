import React, { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react'

interface UCPArticleReferenceProps {
  ucpArticles: string[]
}

// Best-effort mapping of common UCP 600 article numbers to titles
const articleTitles: Record<string, string> = {
  'UCP 600 Art. 1': 'Application of UCP',
  'UCP 600 Art. 2': 'Definitions',
  'UCP 600 Art. 3': 'Interpretations',
  'UCP 600 Art. 4': 'Credits v. Contracts',
  'UCP 600 Art. 5': 'Documents v. Goods, Services or Performance',
  'UCP 600 Art. 6': 'Availability, Expiry Date and Place for Presentation',
  'UCP 600 Art. 7': "Issuing Bank Undertaking",
  'UCP 600 Art. 8': 'Confirming Bank Undertaking',
  'UCP 600 Art. 9': 'Advising of Credits and Amendments',
  'UCP 600 Art. 10': 'Amendments',
  'UCP 600 Art. 11': 'Teletransmitted and Pre-Advised Credits and Amendments',
  'UCP 600 Art. 12': 'Nomination',
  'UCP 600 Art. 13': 'Bank-to-Bank Reimbursement Arrangements',
  'UCP 600 Art. 14': 'Standard for Examination of Documents',
  'UCP 600 Art. 15': 'Complying Presentation',
  'UCP 600 Art. 16': 'Discrepant Documents, Waiver and Notice',
  'UCP 600 Art. 17': 'Original Documents and Copies',
  'UCP 600 Art. 18': 'Commercial Invoice',
  'UCP 600 Art. 19': 'Transport Document Covering at Least Two Different Modes of Transport',
  'UCP 600 Art. 20': 'Bill of Lading',
  'UCP 600 Art. 21': 'Non-Negotiable Sea Waybill',
  'UCP 600 Art. 22': 'Charter Party Bill of Lading',
  'UCP 600 Art. 23': 'Air Transport Document',
  'UCP 600 Art. 24': 'Road, Rail or Inland Waterway Transport Documents',
  'UCP 600 Art. 25': 'Courier Receipt, Post Receipt or Certificate of Posting',
  'UCP 600 Art. 26': '"On Deck", "Shipper\'s Load and Count"',
  'UCP 600 Art. 27': 'Clean Transport Document',
  'UCP 600 Art. 28': 'Insurance Document and Coverage',
  'UCP 600 Art. 29': 'Extension of Expiry Date or Last Day for Presentation',
  'UCP 600 Art. 30': 'Tolerance in Credit Amount, Quantity and Unit Prices',
  'UCP 600 Art. 31': 'Partial Drawings or Shipments',
  'UCP 600 Art. 32': 'Instalment Drawings or Shipments',
  'UCP 600 Art. 33': 'Hours of Presentation',
  'UCP 600 Art. 34': 'Disclaimer on Effectiveness of Documents',
  'UCP 600 Art. 35': 'Disclaimer on Transmission and Translation',
  'UCP 600 Art. 36': 'Force Majeure',
  'UCP 600 Art. 37': 'Disclaimer for Acts of an Instructed Party',
  'UCP 600 Art. 38': 'Transferable Credits',
  'UCP 600 Art. 39': 'Assignment of Proceeds',
}

function getTitleForArticle(article: string): string {
  // Try exact match first
  if (articleTitles[article]) return articleTitles[article]
  // Try to find by article number prefix
  const match = Object.entries(articleTitles).find(([key]) =>
    article.toLowerCase().includes(key.toLowerCase())
  )
  return match ? match[1] : 'UCP 600 Provision'
}

export const UCPArticleReference: React.FC<UCPArticleReferenceProps> = ({ ucpArticles }) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  if (!ucpArticles || ucpArticles.length === 0) {
    return null
  }

  const toggle = (i: number) =>
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-[#1e3a5f]" />
        <h4 className="text-sm font-semibold text-gray-700">UCP 600 References</h4>
      </div>
      {ucpArticles.map((article, i) => (
        <div
          key={i}
          className="border border-blue-100 rounded-lg overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggle(i)}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
          >
            {expanded[i] ? (
              <ChevronDown className="w-4 h-4 text-[#1e3a5f] flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#1e3a5f] flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-[#1e3a5f] flex-1">{article}</span>
          </button>
          {expanded[i] && (
            <div className="px-4 py-2.5 bg-white">
              <p className="text-sm text-gray-700">{getTitleForArticle(article)}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
