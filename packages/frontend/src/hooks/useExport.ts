import { useState, useCallback } from 'react'
import { api } from '../api/client'

interface UseExportResult {
  exportPDF: () => Promise<void>
  exportDOCX: () => Promise<void>
  isExporting: boolean
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

export function useExport(sessionId: string, referenceNumber = 'report'): UseExportResult {
  const [isExporting, setIsExporting] = useState(false)

  const exportPDF = useCallback(async () => {
    setIsExporting(true)
    try {
      const blob = await api.lc.exportPDF(sessionId)
      triggerDownload(blob, `LC_Scrutiny_${referenceNumber}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }, [sessionId, referenceNumber])

  const exportDOCX = useCallback(async () => {
    setIsExporting(true)
    try {
      const blob = await api.lc.exportDOCX(sessionId)
      triggerDownload(blob, `LC_Scrutiny_${referenceNumber}.docx`)
    } finally {
      setIsExporting(false)
    }
  }, [sessionId, referenceNumber])

  return { exportPDF, exportDOCX, isExporting }
}
