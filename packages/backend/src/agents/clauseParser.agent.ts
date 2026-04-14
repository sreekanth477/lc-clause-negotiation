import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import {
  ClauseParserInput,
  ClauseParserOutput,
  ClauseParserOutputSchema,
} from '@lc-copilot/shared';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();

const SYSTEM_PROMPT = `You are a trade finance expert specialising in Letters of Credit under UCP 600. Your task is to segment raw LC text into discrete, typed clauses.

Clause types to detect:
CREDIT_AMOUNT, AVAILABILITY_TERMS, EXPIRY_DATE, SHIPMENT_TERMS, DOCUMENT_REQUIREMENTS, PAYMENT_TERMS, REIMBURSEMENT, CONFIRMATION, SPECIAL_CONDITIONS, GOVERNING_LAW, OTHER

Rules:
- Each clause must be a complete, standalone LC condition
- Do not split a single condition across multiple clauses
- Do not merge distinct conditions into one clause
- Return ONLY valid JSON — no preamble, no markdown

Output JSON schema:
[{ "clauseIndex": number, "clauseType": string, "text": string }]`;

export async function parseLC(input: ClauseParserInput): Promise<ClauseParserOutput> {
  const startTime = Date.now();

  const userMessage = `Parse the following ${input.lcType} Letter of Credit into typed clauses:\n\n${input.rawText}`;

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (error) {
    const err = error as Error;
    throw new Error(`Claude API call failed in clauseParser: ${err.message}`);
  }

  const latencyMs = Date.now() - startTime;
  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

  // Log API usage (best-effort, don't fail on log error)
  try {
    await prisma.apiUsageLog.create({
      data: {
        model: response.model,
        tokensUsed,
        latencyMs,
        endpoint: 'clauseParser',
      },
    });
  } catch {
    console.warn('Failed to log API usage for clauseParser');
  }

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from clauseParser agent');
  }

  // Extract JSON from response (handle markdown code fences if present)
  let jsonText = content.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('clauseParser: Failed to parse JSON response:', jsonText.slice(0, 500));
    throw new Error('clauseParser agent returned invalid JSON');
  }

  const validation = ClauseParserOutputSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('clauseParser: Zod validation failed:', validation.error.issues);
    throw new Error(`clauseParser output validation failed: ${validation.error.message}`);
  }

  return validation.data;
}
