import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { logAuditEvent, AuditEventType } from '../middleware/audit.middleware';
import { submitFeedback } from '../services/feedback.service';
import { assertSessionAccess } from '../services/lcSession.service';
import { OfficerDecisionSchema, EscalationSchema, FeedbackSchema } from '@lc-copilot/shared';

const router = Router();
const prisma = new PrismaClient();
router.use(authenticate);

/**
 * Loads a clause and enforces that the caller may mutate it.
 * Throws 404 if the clause does not exist or 403 if the caller lacks access.
 */
async function loadClauseWithAccess(
  clauseId: string,
  userId: string,
  role: import('@lc-copilot/shared').UserRole
) {
  const clause = await prisma.clause.findUnique({
    where: { id: clauseId },
    select: { id: true, sessionId: true, clauseIndex: true },
  });
  if (!clause) {
    throw Object.assign(new Error('Clause not found'), { statusCode: 404 });
  }
  await assertSessionAccess(clause.sessionId, userId, role);
  return clause;
}

// POST /api/clauses/:id/decision
router.post('/:id/decision', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = OfficerDecisionSchema.parse(req.body);
    const clauseId = req.params.id;
    const clause = await loadClauseWithAccess(clauseId, req.user!.userId, req.user!.role);

    // Upsert decision (one decision per clause)
    const decision = await prisma.officerDecision.upsert({
      where: { clauseId },
      create: {
        clauseId,
        decision: input.decision,
        finalText: input.finalText,
        decisionNote: input.decisionNote,
      },
      update: {
        decision: input.decision,
        finalText: input.finalText,
        decisionNote: input.decisionNote,
        decidedAt: new Date(),
      },
    });

    await logAuditEvent(clause.sessionId, req.user!.userId, AuditEventType.OFFICER_DECISION, {
      clauseId,
      clauseIndex: clause.clauseIndex,
      decision: input.decision,
    });

    res.json(decision);
  } catch (error) {
    next(error);
  }
});

// POST /api/clauses/:id/escalate
router.post('/:id/escalate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = EscalationSchema.parse(req.body);
    const clauseId = req.params.id;
    await loadClauseWithAccess(clauseId, req.user!.userId, req.user!.role);

    const clause = await prisma.clause.update({
      where: { id: clauseId },
      data: { isEscalated: true, escalationNote: input.escalationNote },
    });

    // Check if any clause in session is escalated — update session status
    const escalatedCount = await prisma.clause.count({
      where: { sessionId: clause.sessionId, isEscalated: true },
    });
    if (escalatedCount > 0) {
      await prisma.lCSession.update({
        where: { id: clause.sessionId },
        data: { status: 'ESCALATED' },
      });
    }

    await logAuditEvent(clause.sessionId, req.user!.userId, AuditEventType.ESCALATION_RAISED, {
      clauseId,
      escalationNote: input.escalationNote,
    });

    res.json({ message: 'Clause escalated successfully', clause });
  } catch (error) {
    next(error);
  }
});

// POST /api/clauses/:id/feedback
router.post('/:id/feedback', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = FeedbackSchema.parse(req.body);
    await loadClauseWithAccess(req.params.id, req.user!.userId, req.user!.role);
    const feedback = await submitFeedback(req.params.id, req.user!.userId, input);
    res.json(feedback);
  } catch (error) {
    next(error);
  }
});

export default router;
