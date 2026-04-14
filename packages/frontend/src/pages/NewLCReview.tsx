import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { LCType } from '@lc-copilot/shared'
import { LCUploader } from '../components/lc/LCUploader'
import { api } from '../api/client'

type StepStatus = 'pending' | 'loading' | 'done' | 'error'

interface Step {
  label: string
  status: StepStatus
}

const LC_TYPE_OPTIONS = Object.values(LCType).map((v) => ({
  value: v,
  label: v.replace(/_/g, ' '),
}))

export const NewLCReview: React.FC = () => {
  const navigate = useNavigate()

  const [applicantName, setApplicantName] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [lcType, setLcType] = useState<LCType>(LCType.SIGHT)
  const [lcText, setLcText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [steps, setSteps] = useState<Step[]>([
    { label: 'Uploading Document', status: 'pending' },
    { label: 'Extracting Clauses', status: 'pending' },
    { label: 'Ready for Review', status: 'pending' },
  ])

  const updateStep = (index: number, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applicantName.trim()) {
      setError('Applicant name is required.')
      return
    }
    if (!lcText.trim()) {
      setError('Please provide the LC text.')
      return
    }

    setError(null)
    setSubmitting(true)

    // Reset steps
    setSteps([
      { label: 'Uploading Document', status: 'loading' },
      { label: 'Extracting Clauses', status: 'pending' },
      { label: 'Ready for Review', status: 'pending' },
    ])

    try {
      // Step 1: Create session
      const { sessionId } = await api.lc.createSession({
        applicantName: applicantName.trim(),
        referenceNumber: referenceNumber.trim() || undefined,
        lcType,
        rawText: lcText.trim(),
      })
      updateStep(0, 'done')

      // Step 2: Parse clauses
      updateStep(1, 'loading')
      await api.lc.parseSession(sessionId)
      updateStep(1, 'done')

      // Step 3: Ready
      updateStep(2, 'done')

      // Brief pause for UX
      await new Promise((r) => setTimeout(r, 600))
      navigate(`/lc/${sessionId}/review`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      setError(msg)
      setSubmitting(false)
      setSteps((prev) =>
        prev.map((s) => (s.status === 'loading' ? { ...s, status: 'error' } : s))
      )
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">New LC Review</h1>
        <p className="text-sm text-gray-500 mt-1">
          Submit an LC for AI-powered clause analysis
        </p>
      </div>

      {!submitting ? (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {/* Applicant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Applicant Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="e.g. ABC Trading Co. Ltd"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
              required
            />
          </div>

          {/* LC Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LC Reference{' '}
              <span className="text-gray-400 font-normal">(optional — auto-generated if blank)</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. LC-2024-001234"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
            />
          </div>

          {/* LC Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LC Type <span className="text-red-500">*</span>
            </label>
            <select
              value={lcType}
              onChange={(e) => setLcType(e.target.value as LCType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent bg-white"
            >
              {LC_TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* LC Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LC Document <span className="text-red-500">*</span>
            </label>
            <LCUploader value={lcText} onChange={setLcText} />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#1e3a5f] hover:bg-[#2d6a9f] text-white font-semibold text-sm py-3 rounded-lg transition-colors"
          >
            Analyse LC
          </button>
        </form>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-base font-semibold text-gray-800 mb-6 text-center">
            Processing your LC...
          </h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0">
                  {step.status === 'loading' && (
                    <Loader2 className="w-5 h-5 text-[#1e3a5f] animate-spin" />
                  )}
                  {step.status === 'done' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {step.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    step.status === 'done'
                      ? 'text-green-600'
                      : step.status === 'loading'
                      ? 'text-[#1e3a5f]'
                      : step.status === 'error'
                      ? 'text-red-500'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          {error && (
            <div className="mt-5 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => setSubmitting(false)}
                  className="text-xs underline mt-1 hover:no-underline"
                >
                  Go back and try again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
