import { RiskLevel, ClauseType, DecisionType } from './lc.types';
import { RiskFinding, AlternativeWording } from './agent.types';

export interface ClauseReportRow {
  clauseIndex: number;
  clauseType: ClauseType;
  originalText: string;
  riskLevel: RiskLevel;
  isSoftClause: boolean;
  confidenceScore: number;
  findings: RiskFinding[];
  ucpArticles: string[];
  bankRulesHit: string[];
  alternatives: AlternativeWording[];
  decision?: {
    decision: DecisionType;
    finalText?: string;
    decisionNote?: string;
    decidedAt: string;
  };
  isEscalated: boolean;
  escalationNote?: string;
}

export interface ScrutinyReport {
  reportId: string;
  sessionId: string;
  referenceNumber: string;
  applicantName: string;
  generatedAt: string;
  generatedBy: string;
  executiveSummary: string;
  riskCounts: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    COMPLIANT: number;
  };
  keyRiskFindings: string[];
  recommendedActions: string[];
  complianceNotes: string;
  clauses: ClauseReportRow[];
}

export interface ComplianceDashboardData {
  escalations: EscalationItem[];
  riskStats: RiskStats;
  feedbackSummary: FeedbackSummary;
  aiPerformanceMetrics: AIPerformanceMetrics;
}

export interface EscalationItem {
  clauseId: string;
  sessionId: string;
  referenceNumber: string;
  applicantName: string;
  clauseType: ClauseType;
  riskLevel: RiskLevel;
  escalationNote: string;
  escalatedAt: string;
  officerName: string;
}

export interface RiskStats {
  totalSessions: number;
  totalClauses: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  compliantCount: number;
  softClauseCount: number;
  riskTrend: Array<{ date: string; HIGH: number; MEDIUM: number; LOW: number }>;
}

export interface FeedbackSummary {
  HELPFUL: number;
  PARTIALLY_HELPFUL: number;
  NOT_HELPFUL: number;
  total: number;
}

export interface AIPerformanceMetrics {
  averageConfidenceScore: number;
  totalAnalyses: number;
  acceptanceRate: number;
  editRate: number;
  rejectionRate: number;
  escalationRate: number;
}
