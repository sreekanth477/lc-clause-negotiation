import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import {
  ScrutinyReportContent,
  ScrutinyReportContentSchema,
  RiskLevel,
} from '@lc-copilot/shared';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();

const SYSTEM_PROMPT = `You are a trade finance documentation specialist. Generate a formal LC Scrutiny Report in professional banking language.

Report sections to produce:
1. Executive Summary (risk count table: HIGH/MEDIUM/LOW/COMPLIANT)
2. Key Risk Findings (top 3 HIGH risks, plain English summary)
3. Recommended Actions for Applicant
4. Compliance Officer Notes (if any escalations)

Output JSON with these keys:
{
  "executiveSummary": string,
  "riskCounts": { "HIGH": n, "MEDIUM": n, "LOW": n, "COMPLIANT": n },
  "keyRiskFindings": string[],
  "recommendedActions": string[],
  "complianceNotes": string
}`;

interface ClauseWithDecision {
  clauseIndex: number;
  clauseType: string;
  originalText: string;
  riskLevel: string;
  isSoftClause: boolean;
  isEscalated: boolean;
  escalationNote?: string | null;
  riskFindings: unknown;
  ucpArticles: string[];
  bankRulesHit: string[];
  officerDecision?: {
    decision: string;
    finalText?: string | null;
    decisionNote?: string | null;
  } | null;
}

export async function generateReport(
  session: { id: string; referenceNumber: string; applicantName: string; lcType: string },
  clauses: ClauseWithDecision[]
): Promise<ScrutinyReportContent> {
  const startTime = Date.now();

  const riskCounts = {
    HIGH: clauses.filter((c) => c.riskLevel === RiskLevel.HIGH).length,
    MEDIUM: clauses.filter((c) => c.riskLevel === RiskLevel.MEDIUM).length,
    LOW: clauses.filter((c) => c.riskLevel === RiskLevel.LOW).length,
    COMPLIANT: clauses.filter((c) => c.riskLevel === RiskLevel.COMPLIANT).length,
  };

  const sessionSummary = `LC Reference: ${session.referenceNumber}
Applicant: ${session.applicantName}
LC Type: ${session.lcType}
Total Clauses: ${clauses.length}
Risk Summary: ${riskCounts.HIGH} HIGH, ${riskCounts.MEDIUM} MEDIUM, ${riskCounts.LOW} LOW, ${riskCounts.COMPLIANT} COMPLIANT
Escalated Clauses: ${clauses.filter((c) => c.isEscalated).length}`;

  const clauseResults = clauses
    .map((c) => {
      const findings = Array.isArray(c.riskFindings)
        ? (c.riskFindings as Array<{ issue: string; explanation: string }>)
            .map((f) => `  - ${f.issue}: ${f.explanation}`)
            .join('\n')
        : '';

      return `Clause ${c.clauseIndex} (${c.clauseType}): ${c.riskLevel}${c.isSoftClause ? ' [SOFT CLAUSE]' : ''}
UCP Articles: ${c.ucpArticles.join(', ') || 'None'}
Bank Rules: ${c.bankRulesHit.join(', ') || 'None'}
${findings}
Decision: ${c.officerDecision?.decision ?? 'Pending'}`;
    })
    .join('\n\n');

  const userMessage = `Generate a formal LC Scrutiny Report for the following session:

SESSION DATA:
${sessionSummary}

CLAUSE ANALYSIS RESULTS:
${clauseResults}`;

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (error) {
    const err = error as Error;
    throw new Error(`Claude API call failed in reportGenerator: ${err.message}`);
  }

  const latencyMs = Date.now() - startTime;
  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

  try {
    await prisma.apiUsageLog.create({
      data: {
        model: response.model,
        tokensUsed,
        latencyMs,
        sessionId: session.id,
        endpoint: 'reportGenerator',
      },
    });
  } catch {
    console.warn('Failed to log API usage for reportGenerator');
  }

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from reportGenerator agent');
  }

  let jsonText = content.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  const objMatch = jsonText.match(/\{[\s\S]*\}/);
  if (objMatch) {
    jsonText = objMatch[0];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error('reportGenerator: Failed to parse JSON:', jsonText.slice(0, 500));
    // Return structured fallback
    return {
      executiveSummary: `LC Scrutiny Report for ${session.referenceNumber}. Total clauses analysed: ${clauses.length}. Risk summary: ${riskCounts.HIGH} HIGH, ${riskCounts.MEDIUM} MEDIUM, ${riskCounts.LOW} LOW, ${riskCounts.COMPLIANT} COMPLIANT.`,
      riskCounts,
      keyRiskFindings: clauses
        .filter((c) => c.riskLevel === RiskLevel.HIGH)
        .slice(0, 3)
        .map(
          (c) =>
            `Clause ${c.clauseIndex} (${c.clauseType}): ${c.isSoftClause ? 'Soft clause detected. ' : ''}Requires amendment before LC can be accepted.`
        ),
      recommendedActions: [
        'Review and amend all HIGH risk clauses before submission.',
        'Seek legal counsel for any escalated clauses.',
        'Obtain compliance officer sign-off before issuing LC.',
      ],
      complianceNotes:
        clauses.filter((c) => c.isEscalated).length > 0
          ? `${clauses.filter((c) => c.isEscalated).length} clause(s) have been escalated for compliance review.`
          : 'No compliance escalations.',
    };
  }

  // Inject computed riskCounts to ensure accuracy
  if (parsed && typeof parsed === 'object') {
    (parsed as Record<string, unknown>).riskCounts = riskCounts;
  }

  const validation = ScrutinyReportContentSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('reportGenerator: Zod validation failed:', validation.error.issues);
    throw new Error(`reportGenerator output validation failed: ${validation.error.message}`);
  }

  return validation.data;
}
