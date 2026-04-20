import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Play,
  Check,
  Edit3,
  X,
  ArrowUp,
  MessageSquare,
  ThumbsUp,
  Minus,
  ThumbsDown,
  AlertTriangle,
  FileText,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { RiskLevel, DecisionType, FeedbackRating } from '@lc-copilot/shared'
import { useToast } from '../components/shared/Toast'
import { useLCSession } from '../hooks/useLCSession'
import { useClauseReview } from '../hooks/useClauseReview'
import { useLCStore } from '../store/lcStore'
import { api } from '../api/client'
import { RiskBadge } from '../components/shared/RiskBadge'
import { ConfidenceScore } from '../components/shared/ConfidenceScore'
import { ClauseCard } from '../components/lc/ClauseCard'
import { AlternativeWording } from '../components/lc/AlternativeWording'
import { ClauseComparison } from '../components/lc/ClauseComparison'
import { NegotiationNote } from '../components/lc/NegotiationNote'
import { UCPArticleReference } from '../components/lc/UCPArticleReference'
import type { FilterMode } from '../store/lcStore'
import type { ClauseWithAnalysis } from '../api/client'

type DecisionMode = 'none' | 'edit' | 'own' | 'escalate'

function formatClauseType(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

const FINDING_STYLE: Record<'HIGH' | 'MEDIUM' | 'LOW', { border: string; bg: string; dot: string; label: string }> = {
  HIGH:   { border: 'border-l-red-500',   bg: 'bg-red-50',   dot: 'bg-red-500',   label: 'text-red-700' },
  MEDIUM: { border: 'border-l-amber-500', bg: 'bg-amber-50', dot: 'bg-amber-500', label: 'text-amber-700' },
  LOW:    { border: 'border-l-yellow-500',bg: 'bg-yellow-50',dot: 'bg-yellow-500',label: 'text-yellow-700' },
}

export const ClauseReview: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { loading, error } = useLCSession(sessionId)
  const { startAnalysis, isAnalysing, progress } = useClauseReview(sessionId ?? '')

  const {
    currentSession,
    clauses,
    activeClauseId,
    setActiveClauseId,
    filterMode,
    setFilterMode,
    recordDecision,
    markEscalated,
    decisions,
  } = useLCStore()

  const { success: toastSuccess, error: toastError } = useToast()
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('none')
  const [editText, setEditText] = useState('')
  const [escalateNote, setEscalateNote] = useState('')
  const [showNegNote, setShowNegNote] = useState(false)
  const [submittingDecision, setSubmittingDecision] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const activeClause: ClauseWithAnalysis | undefined = clauses.find(
    (c) => c.id === activeClauseId
  )

  // Filter clauses for sidebar
  const filteredClauses = clauses.filter((c) => {
    if (filterMode === 'HIGH') return c.riskLevel === RiskLevel.HIGH
    if (filterMode === 'UNACTIONED') return !c.decision && !c.isEscalated
    return true
  })

  const actionedCount = clauses.filter((c) => c.decision || c.isEscalated).length
  const allHighActioned = clauses
    .filter((c) => c.riskLevel === RiskLevel.HIGH)
    .every((c) => c.decision || c.isEscalated)

  // Decision handlers
  const submitDecision = async (
    type: DecisionType,
    finalText?: string,
    note?: string
  ) => {
    if (!activeClause) return
    setSubmittingDecision(true)
    try {
      await api.clauses.submitDecision(activeClause.id, {
        decision: type,
        finalText,
        decisionNote: note,
      })
      recordDecision(activeClause.id, { decision: type, finalText, decisionNote: note })
      setDecisionMode('none')
      setEditText('')
      toastSuccess('Decision recorded', `Clause ${activeClause.clauseIndex + 1} marked as ${type.replace(/_/g, ' ').toLowerCase()}.`)
    } catch {
      toastError('Failed to save decision', 'Please try again.')
    } finally {
      setSubmittingDecision(false)
    }
  }

  const submitEscalation = async () => {
    if (!activeClause || !escalateNote.trim()) return
    setSubmittingDecision(true)
    try {
      await api.clauses.escalate(activeClause.id, escalateNote.trim())
      markEscalated(activeClause.id, escalateNote.trim())
      setDecisionMode('none')
      setEscalateNote('')
      toastSuccess('Clause escalated', 'Compliance officer has been notified.')
    } catch {
      toastError('Escalation failed', 'Please try again.')
    } finally {
      setSubmittingDecision(false)
    }
  }

  const submitFeedback = async (rating: FeedbackRating) => {
    if (!activeClause) return
    setFeedbackLoading(true)
    try {
      await api.clauses.submitFeedback(activeClause.id, { rating })
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleSelectWording = (wording: string) => {
    setEditText(wording)
    setDecisionMode('edit')
  }

  const highCount       = clauses.filter((c) => c.riskLevel === RiskLevel.HIGH).length
  const unactionedCount = clauses.filter((c) => !c.decision && !c.isEscalated).length

  const filterButtons: { mode: FilterMode; label: string; count: number }[] = [
    { mode: 'ALL',       label: 'All',       count: clauses.length },
    { mode: 'HIGH',      label: 'High Risk', count: highCount },
    { mode: 'UNACTIONED',label: 'Unactioned',count: unactionedCount },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6 overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* Session header */}
        <div className="px-4 py-4 border-b border-gray-200 bg-[#1e3a5f] text-white">
          <p className="text-xs font-mono opacity-75">{currentSession?.referenceNumber ?? '—'}</p>
          <p className="text-sm font-semibold mt-0.5 truncate">{currentSession?.applicantName ?? '—'}</p>
          <p className="text-xs opacity-60 mt-0.5">
            {currentSession?.lcType?.replace(/_/g, ' ') ?? '—'}
          </p>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Progress</span>
            <span className="font-medium text-gray-700">
              {actionedCount} / {clauses.length} actioned
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1e3a5f] rounded-full transition-all duration-300"
              style={{ width: clauses.length ? `${(actionedCount / clauses.length) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Filter */}
        <div className="px-4 py-2 border-b border-gray-100 flex gap-1">
          {filterButtons.map(({ mode, label, count }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors flex flex-col items-center leading-tight ${
                filterMode === mode
                  ? 'bg-[#1e3a5f] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{label}</span>
              <span className={`text-[10px] font-bold ${filterMode === mode ? 'text-blue-200' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Clause list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {filteredClauses.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 px-3">
              {clauses.length === 0
                ? 'No clauses yet. Click "Analyse All Clauses" to begin.'
                : 'No clauses match the current filter.'}
            </p>
          ) : (
            filteredClauses.map((clause) => (
              <ClauseCard
                key={clause.id}
                clause={clause}
                isActive={clause.id === activeClauseId}
                onClick={() => {
                  setActiveClauseId(clause.id)
                  setDecisionMode('none')
                }}
              />
            ))
          )}
        </div>

        {/* Generate report button */}
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            type="button"
            disabled={!allHighActioned || clauses.length === 0}
            onClick={() => navigate(`/lc/${sessionId}/report`)}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-[#1e3a5f] font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generate Report
          </button>
          {!allHighActioned && clauses.length > 0 && (
            <p className="text-xs text-gray-400 text-center mt-1.5">
              Action all HIGH risk clauses first
            </p>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
        {/* Top actions bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 z-10">
          <button
            type="button"
            onClick={startAnalysis}
            disabled={isAnalysing || clauses.length === 0}
            className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2d6a9f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {isAnalysing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isAnalysing ? 'Analysing...' : 'Analyse All Clauses'}
          </button>

          {isAnalysing && (
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{progress.completed} / {progress.total || clauses.length}</span>
                <span>{progress.status}</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1e3a5f] rounded-full transition-all"
                  style={{
                    width:
                      (progress.total || clauses.length)
                        ? `${(progress.completed / (progress.total || clauses.length)) * 100}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 p-6">
          {!activeClause ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
              {clauses.length === 0 ? (
                <>
                  <Play className="w-10 h-10 text-gray-300" />
                  <p className="text-gray-500">
                    Click <strong>"Analyse All Clauses"</strong> to begin
                  </p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-10 h-10 text-gray-300" />
                  <p className="text-gray-500">Select a clause from the left panel</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-5 max-w-3xl">
              {/* Clause header */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded-md">
                    Clause {activeClause.clauseIndex + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatClauseType(activeClause.clauseType)}
                  </span>
                  {activeClause.riskLevel && (
                    <RiskBadge riskLevel={activeClause.riskLevel} />
                  )}
                  {activeClause.isSoftClause && (
                    <div className="flex items-center gap-1 text-amber-600 text-xs font-medium bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Soft Clause
                    </div>
                  )}
                  {activeClause.isEscalated && (
                    <div className="flex items-center gap-1 text-orange-600 text-xs font-medium bg-orange-50 border border-orange-200 px-2 py-1 rounded-md">
                      <ArrowUp className="w-3.5 h-3.5" />
                      Escalated
                    </div>
                  )}
                  {activeClause.decision && (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 border border-green-200 px-2 py-1 rounded-md">
                      <Check className="w-3.5 h-3.5" />
                      {activeClause.decision.decision.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              </div>

              {/* UCP and Bank Rules */}
              {(activeClause.ucpArticles?.length || activeClause.bankRulesHit?.length) ? (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  {activeClause.ucpArticles && activeClause.ucpArticles.length > 0 && (
                    <UCPArticleReference ucpArticles={activeClause.ucpArticles} />
                  )}
                  {activeClause.bankRulesHit && activeClause.bankRulesHit.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Bank Rules Triggered
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {activeClause.bankRulesHit.map((rule, i) => (
                          <span
                            key={i}
                            className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded px-2 py-1"
                          >
                            {rule}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Confidence */}
              {activeClause.confidenceScore !== undefined && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <ConfidenceScore score={activeClause.confidenceScore} />
                </div>
              )}

              {/* Original clause text */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Original Clause Text</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {activeClause.text}
                  </p>
                </div>
              </div>

              {/* Risk findings — color-coded left-border cards */}
              {activeClause.findings && activeClause.findings.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Risk Findings</h4>
                  <div className="space-y-2.5">
                    {activeClause.findings.map((f, i) => {
                      const sty = FINDING_STYLE[f.severity] ?? FINDING_STYLE.LOW
                      return (
                        <div
                          key={i}
                          className={`border-l-4 ${sty.border} ${sty.bg} rounded-r-lg px-3 py-2.5`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${sty.dot}`} />
                            <span className={`text-xs font-bold uppercase tracking-wide ${sty.label}`}>
                              {f.severity}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{f.issue}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.explanation}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Alternative wordings */}
              {activeClause.alternatives && activeClause.alternatives.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Alternative Wordings
                  </h4>
                  <AlternativeWording
                    alternatives={activeClause.alternatives}
                    onSelect={handleSelectWording}
                  />
                </div>
              )}

              {/* Comparison */}
              {activeClause.alternatives && activeClause.alternatives.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <ClauseComparison
                    originalText={activeClause.text}
                    proposedText={
                      editText || activeClause.alternatives[0]?.wording || activeClause.text
                    }
                  />
                </div>
              )}

              {/* Decision buttons */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Decision</h4>

                {/* COMPLIANT notice */}
                {activeClause.riskLevel === RiskLevel.COMPLIANT && !activeClause.decision && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-2">
                    <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Fully Compliant</p>
                      <p className="text-xs text-green-600 mt-0.5">This clause is aligned with UCP 600 and bank policy. No action required.</p>
                    </div>
                  </div>
                )}

                {decisionMode === 'none' && !activeClause.decision && !activeClause.isEscalated && (
                  <div className="flex flex-wrap gap-2">
                    {activeClause.riskLevel === RiskLevel.COMPLIANT ? (
                      <button
                        type="button"
                        onClick={() => submitDecision(DecisionType.ACCEPTED_ORIGINAL)}
                        disabled={submittingDecision}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Accept Original — No Change
                      </button>
                    ) : (
                    <>
                    <button
                      type="button"
                      onClick={() =>
                        submitDecision(
                          DecisionType.ACCEPTED_AI_SUGGESTION,
                          activeClause.alternatives?.[0]?.wording
                        )
                      }
                      disabled={submittingDecision}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Accept AI Suggestion
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditText(activeClause.alternatives?.[0]?.wording ?? activeClause.text)
                        setDecisionMode('edit')
                      }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit &amp; Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditText('')
                        setDecisionMode('own')
                      }}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Reject – Write Own
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionMode('escalate')}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                      Escalate
                    </button>
                    </>
                    )}
                  </div>
                )}

                {/* Edit mode */}
                {decisionMode === 'edit' && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Edit wording
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={5}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-y"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          submitDecision(DecisionType.EDITED_AI_SUGGESTION, editText)
                        }
                        disabled={!editText.trim() || submittingDecision}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                      >
                        {submittingDecision ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionMode('none')}
                        className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Write own mode */}
                {decisionMode === 'own' && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Write your own wording
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={5}
                      placeholder="Enter your proposed clause wording..."
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-y"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          submitDecision(DecisionType.REJECTED_WROTE_OWN, editText)
                        }
                        disabled={!editText.trim() || submittingDecision}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                      >
                        {submittingDecision ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Submit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionMode('none')}
                        className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Escalate mode */}
                {decisionMode === 'escalate' && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Escalation note (required)
                    </label>
                    <textarea
                      value={escalateNote}
                      onChange={(e) => setEscalateNote(e.target.value)}
                      rows={3}
                      placeholder="Describe why this clause needs escalation..."
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={submitEscalation}
                        disabled={!escalateNote.trim() || submittingDecision}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                      >
                        {submittingDecision ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowUp className="w-4 h-4" />
                        )}
                        Escalate
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionMode('none')}
                        className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Negotiation Note + Feedback */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowNegNote(true)}
                  className="flex items-center gap-2 text-sm text-[#1e3a5f] font-medium border border-[#1e3a5f] px-4 py-2 rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Generate Negotiation Note
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Was this analysis helpful?</span>
                  <button
                    type="button"
                    disabled={feedbackLoading}
                    onClick={() => submitFeedback(FeedbackRating.HELPFUL)}
                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                    title="Helpful"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={feedbackLoading}
                    onClick={() => submitFeedback(FeedbackRating.PARTIALLY_HELPFUL)}
                    className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    title="Partially helpful"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={feedbackLoading}
                    onClick={() => submitFeedback(FeedbackRating.NOT_HELPFUL)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Not helpful"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Negotiation Note modal */}
      {showNegNote && activeClause && currentSession && (
        <NegotiationNote
          clause={activeClause}
          session={currentSession}
          onClose={() => setShowNegNote(false)}
        />
      )}
    </div>
  )
}
