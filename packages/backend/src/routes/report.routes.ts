import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { logAuditEvent, AuditEventType } from '../middleware/audit.middleware';
import { getFeedbackSummary } from '../services/feedback.service';
import { UserRole } from '@lc-copilot/shared';

const router = Router();
const prisma = new PrismaClient();
router.use(authenticate);
router.use(requireRole(UserRole.COMPLIANCE_OFFICER, UserRole.ADMIN));

// GET /api/compliance/dashboard
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Escalated clauses queue
    const escalatedClauses = await prisma.clause.findMany({
      where: { isEscalated: true },
      include: {
        session: {
          include: { officer: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const escalations = escalatedClauses.map((c) => ({
      clauseId: c.id,
      sessionId: c.sessionId,
      referenceNumber: c.session.referenceNumber,
      applicantName: c.session.applicantName,
      clauseType: c.clauseType,
      riskLevel: c.riskLevel,
      escalationNote: c.escalationNote ?? '',
      escalatedAt: c.createdAt.toISOString(),
      officerName: c.session.officer.name,
    }));

    // Risk statistics
    const totalSessions = await prisma.lCSession.count();
    const clauseCounts = await prisma.clause.groupBy({
      by: ['riskLevel'],
      _count: { riskLevel: true },
    });

    const riskStats = {
      totalSessions,
      totalClauses: clauseCounts.reduce((s, c) => s + c._count.riskLevel, 0),
      highRiskCount: clauseCounts.find((c) => c.riskLevel === 'HIGH')?._count.riskLevel ?? 0,
      mediumRiskCount: clauseCounts.find((c) => c.riskLevel === 'MEDIUM')?._count.riskLevel ?? 0,
      lowRiskCount: clauseCounts.find((c) => c.riskLevel === 'LOW')?._count.riskLevel ?? 0,
      compliantCount: clauseCounts.find((c) => c.riskLevel === 'COMPLIANT')?._count.riskLevel ?? 0,
      softClauseCount: await prisma.clause.count({ where: { isSoftClause: true } }),
      riskTrend: await getRiskTrend(),
    };

    // Feedback summary
    const feedbackSummary = await getFeedbackSummary();

    // AI performance metrics
    const decisions = await prisma.officerDecision.findMany({
      select: { decision: true },
    });
    const totalDecisions = decisions.length;
    const aiPerformanceMetrics = {
      averageConfidenceScore: await getAverageConfidence(),
      totalAnalyses: await prisma.clause.count({ where: { confidenceScore: { gt: 0 } } }),
      acceptanceRate: totalDecisions
        ? decisions.filter((d) => d.decision === 'ACCEPTED_AI_SUGGESTION').length / totalDecisions
        : 0,
      editRate: totalDecisions
        ? decisions.filter((d) => d.decision === 'EDITED_AI_SUGGESTION').length / totalDecisions
        : 0,
      rejectionRate: totalDecisions
        ? decisions.filter((d) => d.decision === 'REJECTED_WROTE_OWN').length / totalDecisions
        : 0,
      escalationRate: totalDecisions
        ? decisions.filter((d) => d.decision === 'ESCALATED').length / totalDecisions
        : 0,
    };

    res.json({ escalations, riskStats, feedbackSummary, aiPerformanceMetrics });
  } catch (error) {
    next(error);
  }
});

// POST /api/compliance/escalations/:id/resolve
router.post('/escalations/:id/resolve', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { resolution, notes } = req.body as { resolution: string; notes: string };
    const clauseId = req.params.id;

    const clause = await prisma.clause.update({
      where: { id: clauseId },
      data: { isEscalated: false },
    });

    // Record resolution as officer decision
    await prisma.officerDecision.upsert({
      where: { clauseId },
      create: {
        clauseId,
        decision: 'ACCEPTED_ORIGINAL',
        decisionNote: `COMPLIANCE RESOLUTION: ${resolution}. Notes: ${notes}`,
      },
      update: {
        decisionNote: `COMPLIANCE RESOLUTION: ${resolution}. Notes: ${notes}`,
        decidedAt: new Date(),
      },
    });

    await logAuditEvent(clause.sessionId, req.user!.userId, AuditEventType.ESCALATION_RESOLVED, {
      clauseId,
      resolution,
      notes,
    });

    res.json({ message: 'Escalation resolved', clauseId });
  } catch (error) {
    next(error);
  }
});

async function getRiskTrend() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const clauses = await prisma.clause.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, riskLevel: true },
    orderBy: { createdAt: 'asc' },
  });

  const byDay: Record<string, { HIGH: number; MEDIUM: number; LOW: number }> = {};
  for (const c of clauses) {
    const day = c.createdAt.toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    if (c.riskLevel === 'HIGH') byDay[day].HIGH++;
    else if (c.riskLevel === 'MEDIUM') byDay[day].MEDIUM++;
    else if (c.riskLevel === 'LOW') byDay[day].LOW++;
  }

  return Object.entries(byDay).map(([date, counts]) => ({ date, ...counts }));
}

async function getAverageConfidence(): Promise<number> {
  const result = await prisma.clause.aggregate({
    _avg: { confidenceScore: true },
    where: { confidenceScore: { gt: 0 } },
  });
  return result._avg.confidenceScore ?? 0;
}

export default router;
