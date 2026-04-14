import React, { useState } from 'react'
import { FileText, FileDown, Loader2 } from 'lucide-react'
import { api } from '../../api/client'

interface ExportButtonsProps {
  sessionId: string
  referenceNumber?: string
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  sessionId,
  referenceNumber = 'report',
}) => {
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingDOCX, setLoadingDOCX] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExportPDF = async () => {
    setLoadingPDF(true)
    setError(null)
    try {
      const blob = await api.lc.exportPDF(sessionId)
      triggerDownload(blob, `LC_Scrutiny_${referenceNumber}.pdf`)
    } catch {
      setError('Failed to export PDF. Please try again.')
    } finally {
      setLoadingPDF(false)
    }
  }

  const handleExportDOCX = async () => {
    setLoadingDOCX(true)
    setError(null)
    try {
      const blob = await api.lc.exportDOCX(sessionId)
      triggerDownload(blob, `LC_Scrutiny_${referenceNumber}.docx`)
    } catch {
      setError('Failed to export DOCX. Please try again.')
    } finally {
      setLoadingDOCX(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={loadingPDF}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loadingPDF ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Export PDF
        </button>

        <button
          type="button"
          onClick={handleExportDOCX}
          disabled={loadingDOCX}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loadingDOCX ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          Export DOCX
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
