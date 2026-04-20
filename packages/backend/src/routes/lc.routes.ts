import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { logAuditEvent, AuditEventType } from '../middleware/audit.middleware';
import {
  createSession,
  getSessions,
  getSessionById,
  parseSessionClauses,
  analyseSessionClauses,
  updateSessionStatus,
  assertSessionAccess,
} from '../services/lcSession.service';
import { generateReport } from '../agents/reportGenerator.agent';
import { exportToPDF, exportToDOCX } from '../services/export.service';
import { CreateLCSessionSchema, SessionStatusSchema } from '@lc-copilot/shared';

const router = Router();
router.use(authenticate);

// POST /api/lc/sessions
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = CreateLCSessionSchema.parse(req.body);
    const session = await createSession(body, req.user!.userId);
    res.status(201).json({ sessionId: session.id, referenceNumber: session.referenceNumber });
  } catch (error) {
    next(error);
  }
});

// GET /api/lc/sessions
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, page, limit } = req.query;
    const result = await getSessions(
      req.user!.userId,
      req.user!.role,
      status as string | undefined,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 20
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/lc/sessions/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await getSessionById(req.params.id, req.user!.userId, req.user!.role);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

// POST /api/lc/sessions/:id/parse
router.post('/:id/parse', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clauses = await parseSessionClauses(req.params.id, req.user!.userId, req.user!.role);
    res.json({ clauses });
  } catch (error) {
    next(error);
  }
});

// POST /api/lc/sessions/:id/analyse  (SSE)
router.post('/:id/analyse', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await analyseSessionClauses(req.params.id, req.user!.userId, req.user!.role, res);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/lc/sessions/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = SessionStatusSchema.parse(req.body?.status);
    const session = await updateSessionStatus(
      req.params.id,
      status,
      req.user!.userId,
      req.user!.role
    );
    res.json(session);
  } catch (error) {
    next(error);
  }
});

// GET /api/lc/sessions/:id/report
router.get('/:id/report', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await getSessionById(req.params.id, req.user!.userId, req.user!.role);

    const reportContent = await generateReport(
      {
        id: session.id,
        referenceNumber: session.referenceNumber,
        applicantName: session.applicantName,
        lcType: session.lcType,
      },
      session.clauses.map((c) => ({
        clauseIndex: c.clauseIndex,
        clauseType: c.clauseType,
        originalText: c.originalText,
        riskLevel: c.riskLevel,
        isSoftClause: c.isSoftClause,
        isEscalated: c.isEscalated,
        escalationNote: c.escalationNote,
        riskFindings: c.riskFindings,
        ucpArticles: c.ucpArticles,
        bankRulesHit: c.bankRulesHit,
        officerDecision: c.officerDecision,
      }))
    );

    await logAuditEvent(session.id, req.user!.userId, AuditEventType.REPORT_GENERATED, {
      riskCounts: reportContent.riskCounts,
    });

    res.json({
      reportId: `RPT-${session.id.slice(0, 8).toUpperCase()}`,
      sessionId: session.id,
      referenceNumber: session.referenceNumber,
      applicantName: session.applicantName,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user!.email,
      ...reportContent,
      clauses: session.clauses,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/lc/sessions/:id/export/pdf
router.get('/:id/export/pdf', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await assertSessionAccess(req.params.id, req.user!.userId, req.user!.role);
    const pdfBuffer = await exportToPDF(req.params.id);
    await logAuditEvent(req.params.id, req.user!.userId, AuditEventType.EXPORT_DOWNLOADED, { format: 'pdf' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LC-Report-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/lc/sessions/:id/export/docx
router.get('/:id/export/docx', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await assertSessionAccess(req.params.id, req.user!.userId, req.user!.role);
    const docxBuffer = await exportToDOCX(req.params.id);
    await logAuditEvent(req.params.id, req.user!.userId, AuditEventType.EXPORT_DOWNLOADED, { format: 'docx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="LC-Report-${req.params.id}.docx"`);
    res.send(docxBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
