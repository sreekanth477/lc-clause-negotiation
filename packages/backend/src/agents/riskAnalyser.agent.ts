import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import {
  RiskAnalyserInput,
  RiskAnalysisResult,
  RiskAnalysisResultSchema,
  RiskLevel,
} from '@lc-copilot/shared';
import { searchSimilarChunks } from '../rag/vectorStore.service';
import { checkBankRules, formatRulesForPrompt } from '../rules/bankRules.engine';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();

function buildSystemPrompt(ucpContext: string[], bankRulesText: string[]): string {
  const ucpSection =
    ucpContext.length > 0
      ? ucpContext.join('\n\n')
      : 'No specific UCP context retrieved. Apply general UCP 600 principles.';

  const rulesSection =
    bankRulesText.length > 0
      ? bankRulesText.join('\n')
      : 'No specific bank rules triggered.';

  return `You are a senior ICC-certified trade finance compliance expert.
Analyse the following LC clause for compliance with UCP 600 and ISBP 821.

RELEVANT UCP 600 / ISBP 821 CONTEXT (retrieved):
${ucpSection}

BANK POLICY RULES TO CHECK:
${rulesSection}

SOFT CLAUSE DETECTION — flag as HIGH RISK + isSoftClause: true if the clause makes payment conditional on:
- Applicant inspection or approval
- Documents solely in applicant's control
- Vague satisfaction clauses ("acceptable to applicant")
- Any condition that can be blocked unilaterally by the applicant

Risk Classification:
HIGH   — Contradicts UCP 600, soft clause, ambiguous doc requirements, unrealistic timelines, evergreen obligations
MEDIUM — Deviates from ICC practice, unusual for commodity/corridor, potential interpretation dispute
LOW    — Non-standard but acceptable, advisory note warranted
COMPLIANT — Fully aligned with UCP 600 and bank policy

Return ONLY valid JSON — no preamble, no markdown fences:
{
  "riskLevel": "HIGH|MEDIUM|LOW|COMPLIANT",
  "isSoftClause": boolean,
  "confidenceScore": 0.0-1.0,
  "findings": [{ "issue": string, "severity": "HIGH|MEDIUM|LOW", "explanation": string }],
  "ucpArticles": ["Article 14 - Standard for Examination", ...],
  "bankRulesHit": ["RULE_ID_01", ...]
}`;
}

export async function analyseClause(input: RiskAnalyserInput): Promise<RiskAnalysisResult> {
  const startTime = Date.now();

  // Step 1: Retrieve semantically similar UCP/ISBP context
  let ucpContext: string[] = [];
  try {
    ucpContext = await searchSimilarChunks(input.clause.text, 5);
  } catch {
    console.warn('riskAnalyser: Vector search failed, proceeding without RAG context');
  }

  // Step 2: Run bank rules engine
  const ruleHits = checkBankRules(input.clause.text);
  const bankRulesText = formatRulesForPrompt(ruleHits);

  const systemPrompt = buildSystemPrompt(ucpContext, bankRulesText);
  const userMessage = `Analyse this ${input.clause.clauseType} clause:\n\n"${input.clause.text}"`;

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (error) {
    const err = error as Error;
    throw new Error(`Claude API call failed in riskAnalyser: ${err.message}`);
  }

  const latencyMs = Date.now() - startTime;
  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

  try {
    await prisma.apiUsageLog.create({
      data: {
        model: response.model,
        tokensUsed,
        latencyMs,
        clauseId: input.clause.id,
        endpoint: 'riskAnalyser',
      },
    });
  } catch {
    console.warn('Failed to log API usage for riskAnalyser');
  }

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from riskAnalyser agent');
  }

  let jsonText = content.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  // Find JSON object in response
  const objMatch = jsonText.match(/\{[\s\S]*\}/);
  if (objMatch) {
    jsonText = objMatch[0];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error('riskAnalyser: Failed to parse JSON response:', jsonText.slice(0, 500));
    // Return a safe fallback
    return {
      riskLevel: RiskLevel.MEDIUM,
      isSoftClause: false,
      confidenceScore: 0.5,
      findings: [
        {
          issue: 'Analysis unavailable',
          severity: 'MEDIUM',
          explanation: 'AI analysis could not be completed. Manual review required.',
        },
      ],
      ucpArticles: [],
      bankRulesHit: ruleHits.map((h) => h.ruleId),
    };
  }

  const validation = RiskAnalysisResultSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('riskAnalyser: Zod validation failed:', validation.error.issues);
    throw new Error(`riskAnalyser output validation failed: ${validation.error.message}`);
  }

  const result = validation.data;

  // Add REVIEW_RECOMMENDED flag if confidence is low
  if (result.confidenceScore < 0.7) {
    result.findings.unshift({
      issue: 'REVIEW_RECOMMENDED',
      severity: 'MEDIUM',
      explanation: `AI confidence score is ${(result.confidenceScore * 100).toFixed(0)}% — manual review recommended before proceeding.`,
    });
  }

  // Merge any bank rule hits not already captured by Claude
  for (const hit of ruleHits) {
    if (!result.bankRulesHit.includes(hit.ruleId)) {
      result.bankRulesHit.push(hit.ruleId);
    }
  }

  return result;
}
