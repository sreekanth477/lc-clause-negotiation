import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const AuditEventType = {
  SESSION_CREATED: 'SESSION_CREATED',
  CLAUSE_PARSED: 'CLAUSE_PARSED',
  CLAUSE_ANALYSED: 'CLAUSE_ANALYSED',
  OFFICER_DECISION: 'OFFICER_DECISION',
  ESCALATION_RAISED: 'ESCALATION_RAISED',
  ESCALATION_RESOLVED: 'ESCALATION_RESOLVED',
  REPORT_GENERATED: 'REPORT_GENERATED',
  EXPORT_DOWNLOADED: 'EXPORT_DOWNLOADED',
} as const;

export type AuditEventTypeName = typeof AuditEventType[keyof typeof AuditEventType];

export async function logAuditEvent(
  sessionId: string,
  actorId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        eventType,
        eventData,
        actorId,
        sessionId,
      },
    });
  } catch (error) {
    // Audit log failures must not break the main flow
    console.error(`Failed to write audit log [${eventType}]:`, error);
  }
}
