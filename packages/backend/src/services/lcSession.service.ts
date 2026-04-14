import { PrismaClient, SessionStatus, LCType } from '@prisma/client';
import { Response } from 'express';
import {
  CreateLCSessionInput,
  UserRole,
  ParsedClause,
  RiskLevel,
} from '@lc-copilot/shared';
import { parseLC } from '../agents/clauseParser.agent';
import { analyseClause } from '../agents/riskAnalyser.agent';
import { generateAlternatives } from '../agents/wordingGenerator.agent';
import { logAuditEvent, AuditEventType } from '../middleware/audit.middleware';

const prisma = new PrismaClient();

function generateReferenceNumber(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `LC-${ts}-${rand}`;
}

export async function createSession(
  data: CreateLCSessionInput,
  officerId: string
) {
  const referenceNumber = data.referenceNumber ?? generateReferenceNumber();

  const session = await prisma.lCSession.create({
    data: {
      referenceNumber,
      applicantName: data.applicantName,
      lcType: data.lcType as LCType,
      rawText: data.rawText,
      officerId,
      status: 'IN_REVIEW',
    },
  });

  await logAuditEvent(session.id, officerId, AuditEventType.SESSION_CREATED, {
    referenceNumber,
    applicantName: data.applicantName,
    lcType: data.lcType,
  });

  return session;
}

export async function getSessions(
  officerId: string,
  role: UserRole,
  status?: string,
  page = 1,
  limit = 20
) {
  const where: Record<string, unknown> = {};

  // TRADE_RM can only see their own sessions; COMPLIANCE_OFFICER and ADMIN see all
  if (role === UserRole.TRADE_RM) {
    where.officerId = officerId;
  }

  if (status) {
    where.status = status;
  }

  const [sessions, total] = await Promise.all([
    prisma.lCSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        officer: { select: { id: true, name: true, email: true } },
        clauses: {
          select: {
            id: true,
            riskLevel: true,
            isSoftClause: true,
            isEscalated: true,
            officerDecision: { select: { id: true } },
          },
        },
      },
    }),
    prisma.lCSession.count({ where }),
  ]);

  return { sessions, total, page, limit };
}

export async function getSessionById(
  id: string,
  officerId: string,
  role: UserRole
) {
  const session = await prisma.lCSession.findUnique({
    where: { id },
    include: {
      officer: { select: { id: true, name: true, email: true } },
      clauses: {
        orderBy: { clauseIndex: 'asc' },
        include: {
          alternatives: true,
          officerDecision: true,
          feedbacks: true,
        },
      },
    },
  });

  if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

  // Access control: TRADE_RM can only view their own sessions
  if (role === UserRole.TRADE_RM && session.officerId !== officerId) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  return session;
}

export async function updateSessionStatus(id: string, status: SessionStatus) {
  return prisma.lCSession.update({
    where: { id },
    data: { status },
  });
}

export async function parseSessionClauses(
  sessionId: string,
  officerId: string
): Promise<ParsedClause[]> {
  const session = await prisma.lCSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

  // Update status to PARSING
  await prisma.lCSession.update({
    where: { id: sessionId },
    data: { status: 'PARSING' },
  });

  const parsedClauses = await parseLC({
    rawText: session.rawText,
    lcType: session.lcType as import('@lc-copilot/shared').LCType,
  });

  // Delete existing clauses (re-parse scenario)
  await prisma.clause.deleteMany({ where: { sessionId } });

  // Store clauses in DB with placeholder risk values
  await prisma.clause.createMany({
    data: parsedClauses.map((c) => ({
      clauseIndex: c.clauseIndex,
      clauseType: c.clauseType as import('@prisma/client').ClauseType,
      originalText: c.text,
      riskLevel: RiskLevel.COMPLIANT as import('@prisma/client').RiskLevel,
      riskFindings: [],
      ucpArticles: [],
      bankRulesHit: [],
      confidenceScore: 0,
      sessionId,
    })),
  });

  // Update status back to IN_REVIEW
  await prisma.lCSession.update({
    where: { id: sessionId },
    data: { status: 'IN_REVIEW' },
  });

  await logAuditEvent(sessionId, officerId, AuditEventType.CLAUSE_PARSED, {
    clauseCount: parsedClauses.length,
  });

  return parsedClauses;
}

export async function analyseSessionClauses(
  sessionId: string,
  officerId: string,
  res: Response
): Promise<void> {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clauses = await prisma.clause.findMany({
    where: { sessionId },
    orderBy: { clauseIndex: 'asc' },
  });

  if (clauses.length === 0) {
    res.write(`data: ${JSON.stringify({ type: 'ERROR', message: 'No clauses found. Run parse first.' })}\n\n`);
    res.end();
    return;
  }

  for (const clause of clauses) {
    try {
      const clauseInput = {
        id: clause.id,
        sessionId: clause.sessionId,
        clauseIndex: clause.clauseIndex,
        clauseType: clause.clauseType as import('@lc-copilot/shared').ClauseType,
        text: clause.originalText,
      };

      // Run risk analysis
      const analysis = await analyseClause({
        clause: clauseInput,
        ucpContext: [],
        bankRules: [],
      });

      // Generate alternative wordings
      const alternatives = await generateAlternatives({
        clause: clauseInput,
        riskAnalysis: analysis,
      });

      // Persist results to DB
      await prisma.clause.update({
        where: { id: clause.id },
        data: {
          riskLevel: analysis.riskLevel as import('@prisma/client').RiskLevel,
          isSoftClause: analysis.isSoftClause,
          confidenceScore: analysis.confidenceScore,
          riskFindings: analysis.findings as object[],
          ucpArticles: analysis.ucpArticles,
          bankRulesHit: analysis.bankRulesHit,
        },
      });

      // Store alternatives
      if (alternatives.length > 0) {
        await prisma.alternative.deleteMany({ where: { clauseId: clause.id } });
        await prisma.alternative.createMany({
          data: alternatives.map((alt) => ({
            clauseId: clause.id,
            wording: alt.wording,
            rationale: alt.rationale,
            ucpBasis: alt.ucpBasis,
          })),
        });
      }

      await logAuditEvent(sessionId, officerId, AuditEventType.CLAUSE_ANALYSED, {
        clauseId: clause.id,
        clauseIndex: clause.clauseIndex,
        riskLevel: analysis.riskLevel,
        confidenceScore: analysis.confidenceScore,
        alternativesGenerated: alternatives.length,
      });

      // Emit SSE event
      const event = {
        clauseId: clause.id,
        clauseIndex: clause.clauseIndex,
        analysis,
        alternatives,
      };
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      // Small delay to allow client to process
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      const err = error as Error;
      console.error(`Error analysing clause ${clause.id}:`, err.message);
      res.write(
        `data: ${JSON.stringify({
          clauseId: clause.id,
          clauseIndex: clause.clauseIndex,
          error: err.message,
        })}\n\n`
      );
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'COMPLETE' })}\n\n`);
  res.end();
}
