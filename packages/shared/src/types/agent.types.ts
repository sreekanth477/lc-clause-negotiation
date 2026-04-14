import { z } from 'zod';
import { ClauseType, RiskLevel, LCType } from './lc.types';

// ─── Clause Parser Agent ─────────────────────────────────────────────────────

export const ParsedClauseSchema = z.object({
  clauseIndex: z.number().int().nonnegative(),
  clauseType: z.nativeEnum(ClauseType),
  text: z.string().min(1),
});

export const ClauseParserOutputSchema = z.array(ParsedClauseSchema);

export interface ClauseParserInput {
  rawText: string;
  lcType: LCType;
}

export type ParsedClause = z.infer<typeof ParsedClauseSchema>;
export type ClauseParserOutput = z.infer<typeof ClauseParserOutputSchema>;

// ─── Risk Analyser Agent ─────────────────────────────────────────────────────

export const RiskFindingSchema = z.object({
  issue: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  explanation: z.string(),
});

export const RiskAnalysisResultSchema = z.object({
  riskLevel: z.nativeEnum(RiskLevel),
  isSoftClause: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  findings: z.array(RiskFindingSchema),
  ucpArticles: z.array(z.string()),
  bankRulesHit: z.array(z.string()),
});

export interface RiskAnalyserInput {
  clause: ParsedClause & { id: string; sessionId: string };
  ucpContext: string[];
  bankRules: string[];
}

export type RiskFinding = z.infer<typeof RiskFindingSchema>;
export type RiskAnalysisResult = z.infer<typeof RiskAnalysisResultSchema>;

// ─── Wording Generator Agent ─────────────────────────────────────────────────

export const AlternativeWordingSchema = z.object({
  wording: z.string().min(1),
  rationale: z.string().min(1),
  ucpBasis: z.string().min(1),
});

export const WordingGeneratorOutputSchema = z.array(AlternativeWordingSchema);

export interface WordingGeneratorInput {
  clause: ParsedClause & { id: string };
  riskAnalysis: RiskAnalysisResult;
}

export type AlternativeWording = z.infer<typeof AlternativeWordingSchema>;
export type WordingGeneratorOutput = z.infer<typeof WordingGeneratorOutputSchema>;

// ─── Report Generator Agent ──────────────────────────────────────────────────

export const ScrutinyReportContentSchema = z.object({
  executiveSummary: z.string(),
  riskCounts: z.object({
    HIGH: z.number().int().nonnegative(),
    MEDIUM: z.number().int().nonnegative(),
    LOW: z.number().int().nonnegative(),
    COMPLIANT: z.number().int().nonnegative(),
  }),
  keyRiskFindings: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  complianceNotes: z.string(),
});

export type ScrutinyReportContent = z.infer<typeof ScrutinyReportContentSchema>;

// ─── Bank Rules ───────────────────────────────────────────────────────────────

export interface BankRule {
  id: string;
  name: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  patterns: string[];
}

export interface BankRuleHit {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  matchedPattern: string;
}

// ─── SSE Events ───────────────────────────────────────────────────────────────

export interface ClauseAnalysisSSEEvent {
  clauseId: string;
  clauseIndex: number;
  analysis: RiskAnalysisResult;
  alternatives: AlternativeWording[];
}

export interface SSECompleteEvent {
  type: 'COMPLETE';
}

export type SSEEvent = ClauseAnalysisSSEEvent | SSECompleteEvent;
