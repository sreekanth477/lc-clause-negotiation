import axios from 'axios'
import type {
  CreateLCSessionInput,
  OfficerDecisionInput,
  FeedbackInput,
} from '@lc-copilot/shared'
import type {
  ScrutinyReport,
  ComplianceDashboardData,
} from '@lc-copilot/shared'
import type {
  ParsedClause,
  RiskAnalysisResult,
  AlternativeWording,
} from '@lc-copilot/shared'
import type {
  UserRole,
  LCType,
  SessionStatus,
  ClauseType,
  RiskLevel,
  DecisionType,
  FeedbackRating,
} from '@lc-copilot/shared'

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface LCSession {
  id: string
  referenceNumber: string
  applicantName: string
  lcType: LCType
  status: SessionStatus
  createdAt: string
  updatedAt: string
  riskCounts?: {
    HIGH: number
    MEDIUM: number
    LOW: number
    COMPLIANT: number
  }
}

export interface ClauseDecision {
  decision: DecisionType
  finalText?: string
  decisionNote?: string
  decidedAt: string
  decidedBy: string
}

export interface ClauseWithAnalysis {
  id: string
  sessionId: string
  clauseIndex: number
  clauseType: ClauseType
  text: string
  riskLevel?: RiskLevel
  isSoftClause?: boolean
  confidenceScore?: number
  findings?: Array<{ issue: string; severity: 'HIGH' | 'MEDIUM' | 'LOW'; explanation: string }>
  ucpArticles?: string[]
  bankRulesHit?: string[]
  alternatives?: AlternativeWording[]
  analysis?: RiskAnalysisResult
  decision?: ClauseDecision
  isEscalated?: boolean
  escalationNote?: string
  feedbackRating?: FeedbackRating
}

export interface LCSessionDetail extends LCSession {
  rawText: string
  clauses: ClauseWithAnalysis[]
  reportId?: string
  createdByName?: string
}

export interface OfficerDecisionData {
  decision: DecisionType
  finalText?: string
  decisionNote?: string
}

// ─── Axios instance ───────────────────────────────────────────────────────────

const httpClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('lc_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lc_token')
      localStorage.removeItem('lc_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── API surface ──────────────────────────────────────────────────────────────

export const api = {
  auth: {
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
      const { data } = await httpClient.post('/auth/login', { email, password })
      return data
    },
  },

  lc: {
    async createSession(
      payload: CreateLCSessionInput
    ): Promise<{ sessionId: string; referenceNumber: string }> {
      const { data } = await httpClient.post('/lc/sessions', payload)
      return data
    },

    async getSessions(params?: {
      status?: string
      page?: number
      limit?: number
    }): Promise<{ sessions: LCSession[]; total: number }> {
      const { data } = await httpClient.get('/lc/sessions', { params })
      return data
    },

    async getSession(id: string): Promise<LCSessionDetail> {
      const { data } = await httpClient.get(`/lc/sessions/${id}`)
      return data
    },

    async parseSession(id: string): Promise<{ clauses: ParsedClause[] }> {
      const { data } = await httpClient.post(`/lc/sessions/${id}/parse`)
      return data
    },

    async getReport(id: string): Promise<ScrutinyReport> {
      const { data } = await httpClient.get(`/lc/sessions/${id}/report`)
      return data
    },

    async exportPDF(id: string): Promise<Blob> {
      const { data } = await httpClient.get(`/lc/sessions/${id}/export/pdf`, {
        responseType: 'blob',
      })
      return data
    },

    async exportDOCX(id: string): Promise<Blob> {
      const { data } = await httpClient.get(`/lc/sessions/${id}/export/docx`, {
        responseType: 'blob',
      })
      return data
    },

    async completeSession(id: string): Promise<void> {
      await httpClient.patch(`/lc/sessions/${id}/complete`)
    },
  },

  clauses: {
    async submitDecision(id: string, payload: OfficerDecisionInput): Promise<void> {
      await httpClient.post(`/lc/clauses/${id}/decision`, payload)
    },

    async escalate(id: string, note: string): Promise<void> {
      await httpClient.post(`/lc/clauses/${id}/escalate`, { escalationNote: note })
    },

    async submitFeedback(id: string, payload: FeedbackInput): Promise<void> {
      await httpClient.post(`/lc/clauses/${id}/feedback`, payload)
    },
  },

  compliance: {
    async getDashboard(): Promise<ComplianceDashboardData> {
      const { data } = await httpClient.get('/compliance/dashboard')
      return data
    },

    async resolveEscalation(
      id: string,
      payload: { resolution: string; notes: string }
    ): Promise<void> {
      await httpClient.post(`/compliance/escalations/${id}/resolve`, payload)
    },
  },
}
