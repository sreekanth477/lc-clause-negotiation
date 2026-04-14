import { z } from 'zod';

export enum UserRole {
  TRADE_RM = 'TRADE_RM',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  ADMIN = 'ADMIN',
}

export enum LCType {
  SIGHT = 'SIGHT',
  USANCE = 'USANCE',
  STANDBY = 'STANDBY',
  REVOLVING = 'REVOLVING',
  RED_CLAUSE = 'RED_CLAUSE',
  TRANSFERABLE = 'TRANSFERABLE',
}

export enum SessionStatus {
  PARSING = 'PARSING',
  IN_REVIEW = 'IN_REVIEW',
  ESCALATED = 'ESCALATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ClauseType {
  CREDIT_AMOUNT = 'CREDIT_AMOUNT',
  AVAILABILITY_TERMS = 'AVAILABILITY_TERMS',
  EXPIRY_DATE = 'EXPIRY_DATE',
  SHIPMENT_TERMS = 'SHIPMENT_TERMS',
  DOCUMENT_REQUIREMENTS = 'DOCUMENT_REQUIREMENTS',
  PAYMENT_TERMS = 'PAYMENT_TERMS',
  REIMBURSEMENT = 'REIMBURSEMENT',
  CONFIRMATION = 'CONFIRMATION',
  SPECIAL_CONDITIONS = 'SPECIAL_CONDITIONS',
  GOVERNING_LAW = 'GOVERNING_LAW',
  OTHER = 'OTHER',
}

export enum RiskLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  COMPLIANT = 'COMPLIANT',
}

export enum DecisionType {
  ACCEPTED_AI_SUGGESTION = 'ACCEPTED_AI_SUGGESTION',
  EDITED_AI_SUGGESTION = 'EDITED_AI_SUGGESTION',
  REJECTED_WROTE_OWN = 'REJECTED_WROTE_OWN',
  ACCEPTED_ORIGINAL = 'ACCEPTED_ORIGINAL',
  ESCALATED = 'ESCALATED',
}

export enum FeedbackRating {
  HELPFUL = 'HELPFUL',
  PARTIALLY_HELPFUL = 'PARTIALLY_HELPFUL',
  NOT_HELPFUL = 'NOT_HELPFUL',
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const LCTypeSchema = z.nativeEnum(LCType);
export const RiskLevelSchema = z.nativeEnum(RiskLevel);
export const ClauseTypeSchema = z.nativeEnum(ClauseType);
export const SessionStatusSchema = z.nativeEnum(SessionStatus);
export const DecisionTypeSchema = z.nativeEnum(DecisionType);
export const FeedbackRatingSchema = z.nativeEnum(FeedbackRating);

export const CreateLCSessionSchema = z.object({
  applicantName: z.string().min(1, 'Applicant name is required'),
  referenceNumber: z.string().optional(),
  lcType: LCTypeSchema,
  rawText: z.string().min(10, 'LC text must be at least 10 characters'),
});

export const OfficerDecisionSchema = z.object({
  decision: DecisionTypeSchema,
  finalText: z.string().optional(),
  decisionNote: z.string().optional(),
});

export const FeedbackSchema = z.object({
  rating: FeedbackRatingSchema,
  comment: z.string().optional(),
});

export const EscalationSchema = z.object({
  escalationNote: z.string().min(1, 'Escalation note is required'),
});

export type CreateLCSessionInput = z.infer<typeof CreateLCSessionSchema>;
export type OfficerDecisionInput = z.infer<typeof OfficerDecisionSchema>;
export type FeedbackInput = z.infer<typeof FeedbackSchema>;
export type EscalationInput = z.infer<typeof EscalationSchema>;
