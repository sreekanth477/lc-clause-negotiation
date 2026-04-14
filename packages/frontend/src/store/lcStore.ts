import { create } from 'zustand'
import type { RiskAnalysisResult, AlternativeWording } from '@lc-copilot/shared'
import type { LCSessionDetail, ClauseWithAnalysis, OfficerDecisionData } from '../api/client'

export type FilterMode = 'ALL' | 'HIGH' | 'UNACTIONED'

interface AnalysisProgress {
  total: number
  completed: number
  status: string
}

interface LCStoreState {
  currentSession: LCSessionDetail | null
  clauses: ClauseWithAnalysis[]
  activeClauseId: string | null
  analysisProgress: AnalysisProgress
  decisions: Record<string, OfficerDecisionData>
  filterMode: FilterMode

  setCurrentSession: (session: LCSessionDetail | null) => void
  setClauses: (clauses: ClauseWithAnalysis[]) => void
  updateClauseAnalysis: (
    clauseId: string,
    analysis: RiskAnalysisResult,
    alternatives: AlternativeWording[]
  ) => void
  setActiveClauseId: (id: string | null) => void
  setAnalysisProgress: (progress: Partial<AnalysisProgress>) => void
  recordDecision: (clauseId: string, decision: OfficerDecisionData) => void
  markEscalated: (clauseId: string, note: string) => void
  setFilterMode: (mode: FilterMode) => void
  reset: () => void
}

const defaultProgress: AnalysisProgress = { total: 0, completed: 0, status: 'idle' }

export const useLCStore = create<LCStoreState>((set) => ({
  currentSession: null,
  clauses: [],
  activeClauseId: null,
  analysisProgress: defaultProgress,
  decisions: {},
  filterMode: 'ALL',

  setCurrentSession: (session) =>
    set({ currentSession: session, clauses: session?.clauses ?? [] }),

  setClauses: (clauses) => set({ clauses }),

  updateClauseAnalysis: (clauseId, analysis, alternatives) =>
    set((state) => ({
      clauses: state.clauses.map((c) =>
        c.id === clauseId
          ? {
              ...c,
              analysis,
              riskLevel: analysis.riskLevel,
              isSoftClause: analysis.isSoftClause,
              confidenceScore: analysis.confidenceScore,
              findings: analysis.findings,
              ucpArticles: analysis.ucpArticles,
              bankRulesHit: analysis.bankRulesHit,
              alternatives,
            }
          : c
      ),
    })),

  setActiveClauseId: (id) => set({ activeClauseId: id }),

  setAnalysisProgress: (progress) =>
    set((state) => ({
      analysisProgress: { ...state.analysisProgress, ...progress },
    })),

  recordDecision: (clauseId, decision) =>
    set((state) => ({
      decisions: { ...state.decisions, [clauseId]: decision },
      clauses: state.clauses.map((c) =>
        c.id === clauseId
          ? {
              ...c,
              decision: {
                ...decision,
                decidedAt: new Date().toISOString(),
                decidedBy: '',
              },
            }
          : c
      ),
    })),

  markEscalated: (clauseId, note) =>
    set((state) => ({
      clauses: state.clauses.map((c) =>
        c.id === clauseId ? { ...c, isEscalated: true, escalationNote: note } : c
      ),
    })),

  setFilterMode: (mode) => set({ filterMode: mode }),

  reset: () =>
    set({
      currentSession: null,
      clauses: [],
      activeClauseId: null,
      analysisProgress: defaultProgress,
      decisions: {},
      filterMode: 'ALL',
    }),
}))
