import React, { useRef, useState, useCallback } from 'react'
import { Upload, FileText, FileType, X } from 'lucide-react'

interface LCUploaderProps {
  value: string
  onChange: (text: string) => void
}

type Tab = 'upload' | 'paste'

export const LCUploader: React.FC<LCUploaderProps> = ({ value, onChange }) => {
  const [tab, setTab] = useState<Tab>('paste')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (f: File) => {
      setFile(f)
      // For text-like files, attempt to read them
      if (
        f.type === 'text/plain' ||
        f.name.endsWith('.txt') ||
        f.name.endsWith('.docx')
      ) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          onChange(text ?? `[File: ${f.name}]`)
        }
        reader.readAsText(f)
      } else {
        // For PDFs we pass the filename as a placeholder; backend handles parsing
        onChange(`[FILE:${f.name}]`)
      }
    },
    [onChange]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) handleFile(dropped)
    },
    [handleFile]
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const clearFile = () => {
    setFile(null)
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === 'upload'
              ? 'bg-white text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setTab('paste')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === 'paste'
              ? 'bg-white text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Paste Text
        </button>
      </div>

      {/* Upload panel */}
      {tab === 'upload' && (
        <div className="p-4">
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              {file.name.endsWith('.pdf') ? (
                <FileType className="w-8 h-8 text-red-500 flex-shrink-0" />
              ) : (
                <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                dragging
                  ? 'border-[#1e3a5f] bg-blue-50'
                  : 'border-gray-300 hover:border-[#2d6a9f] hover:bg-gray-50'
              }`}
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Drop file here or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT supported</p>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      )}

      {/* Paste panel */}
      {tab === 'paste' && (
        <div className="p-4">
          <textarea
            value={value.startsWith('[FILE:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste raw LC text here..."
            rows={12}
            className="w-full text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
          />
        </div>
      )}
    </div>
  )
}
