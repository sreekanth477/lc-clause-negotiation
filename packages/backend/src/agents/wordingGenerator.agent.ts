import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import {
  WordingGeneratorInput,
  WordingGeneratorOutput,
  WordingGeneratorOutputSchema,
  RiskLevel,
} from '@lc-copilot/shared';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();

const SYSTEM_PROMPT = `You are a senior LC drafting specialist with deep knowledge of ICC model LC forms, UCP 600, and international trade finance best practice.

Requirements for alternative wording:
- Use precise, unambiguous language common in international LC practice
- Remove any soft clause elements entirely — never soften them, remove them
- Align with the specific UCP 600 articles cited
- Maintain the commercial intent of the original clause where possible
- Each alternative must be self-contained and complete
- Rationale must be plain English, max 3 sentences
- ucpBasis must cite specific article numbers

Return ONLY valid JSON — no preamble, no markdown fences:
[{ "wording": string, "rationale": string, "ucpBasis": "UCP 600 Article X – Title" }]`;

export async function generateAlternatives(
  input: WordingGeneratorInput
): Promise<WordingGeneratorOutput> {
  // Do not invoke for COMPLIANT clauses
  if (input.riskAnalysis.riskLevel === RiskLevel.COMPLIANT) {
    return [];
  }

  const startTime = Date.now();

  const riskFindings = input.riskAnalysis.findings
    .map((f) => `- [${f.severity}] ${f.issue}: ${f.explanation}`)
    .join('\n');

  const ucpArticles = input.riskAnalysis.ucpArticles.join(', ') || 'General UCP 600 principles';

  const userMessage = `I have analysed the following ${input.clause.clauseType} clause and found these issues:

ORIGINAL CLAUSE:
"${input.clause.text}"

RISK FINDINGS:
${riskFindings}

Related UCP 600 articles: ${ucpArticles}

Please propose 1-2 bank-safe, ICC-aligned alternative clause wordings.`;

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (error) {
    const err = error as Error;
    throw new Error(`Claude API call failed in wordingGenerator: ${err.message}`);
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
        endpoint: 'wordingGenerator',
      },
    });
  } catch {
    console.warn('Failed to log API usage for wordingGenerator');
  }

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from wordingGenerator agent');
  }

  let jsonText = content.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  const arrMatch = jsonText.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    jsonText = arrMatch[0];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error('wordingGenerator: Failed to parse JSON response:', jsonText.slice(0, 500));
    return [];
  }

  const validation = WordingGeneratorOutputSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('wordingGenerator: Zod validation failed:', validation.error.issues);
    return [];
  }

  return validation.data;
}
