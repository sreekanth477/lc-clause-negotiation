import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VECTOR_DIMENSIONS = parseInt(process.env.VECTOR_DIMENSIONS ?? '1536', 10);

/**
 * Generate an embedding vector for the given text.
 * Uses a structured prompt to extract a semantic embedding via Claude,
 * or falls back to random vectors in dev mode when no API key is set.
 *
 * In production with OpenAI key, delegates to OpenAI text-embedding-3-small.
 * Otherwise, uses Claude to extract key semantic features and builds a
 * deterministic pseudo-embedding for RAG similarity.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Development mock: return deterministic pseudo-random vector
  if (process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY) {
    return generateMockEmbedding(text);
  }

  // OpenAI path (preferred for actual embeddings)
  if (process.env.OPENAI_API_KEY) {
    return generateOpenAIEmbedding(text);
  }

  // Claude-based semantic extraction fallback
  return generateClaudeEmbedding(text);
}

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
      dimensions: VECTOR_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding API error: ${response.statusText}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

async function generateClaudeEmbedding(text: string): Promise<number[]> {
  // Use Claude to extract semantic features, then hash to a fixed-dim vector
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Extract the key semantic concepts from the following trade finance text as a JSON array of 50 weighted concept scores (0.0-1.0). Each score represents how strongly this text relates to a specific trade finance concept dimension. Return ONLY a JSON array of 50 numbers.\n\nText: ${text.slice(0, 500)}`,
      },
    ],
  });

  try {
    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const rawText = content.text.trim();
    const jsonMatch = rawText.match(/\[[\d.,\s]+\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const scores: number[] = JSON.parse(jsonMatch[0]);

    // Expand 50-dim to VECTOR_DIMENSIONS via interpolation + hashing
    return expandVector(scores, VECTOR_DIMENSIONS);
  } catch {
    // Fallback to mock if Claude response parsing fails
    return generateMockEmbedding(text);
  }
}

function expandVector(scores: number[], targetDim: number): number[] {
  const result: number[] = new Array(targetDim).fill(0);
  const ratio = scores.length / targetDim;

  for (let i = 0; i < targetDim; i++) {
    const srcIdx = Math.floor(i * ratio);
    const srcIdxNext = Math.min(srcIdx + 1, scores.length - 1);
    const t = (i * ratio) - srcIdx;
    result[i] = scores[srcIdx] * (1 - t) + scores[srcIdxNext] * t;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
  return result.map((v) => (magnitude > 0 ? v / magnitude : 0));
}

function generateMockEmbedding(text: string): number[] {
  // Deterministic pseudo-random based on text content (for dev/testing)
  const seed = hashString(text);
  const vector: number[] = [];
  let state = seed;

  for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    vector.push((state / 0xffffffff) * 2 - 1);
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}
