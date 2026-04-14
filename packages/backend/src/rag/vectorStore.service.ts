import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from './embeddings.service';

const prisma = new PrismaClient();

export interface KnowledgeChunk {
  id: string;
  source: string;
  articleRef: string;
  title: string;
  content: string;
}

export async function storeKnowledgeChunk(
  source: string,
  articleRef: string,
  title: string,
  content: string
): Promise<string> {
  const embedding = await generateEmbedding(`${title}\n${content}`);
  const embeddingStr = `[${embedding.join(',')}]`;

  // Use raw SQL for vector storage since Prisma doesn't natively support pgvector
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ClauseKnowledgeChunk" (id, source, "articleRef", title, content, embedding, "createdAt")
    VALUES (
      gen_random_uuid(),
      ${source},
      ${articleRef},
      ${title},
      ${content},
      ${embeddingStr}::vector,
      NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  return result[0]?.id ?? '';
}

export async function searchSimilarChunks(
  queryText: string,
  topK: number = 5
): Promise<string[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    const embeddingStr = `[${embedding.join(',')}]`;

    const chunks = await prisma.$queryRaw<KnowledgeChunk[]>`
      SELECT id, source, "articleRef", title, content
      FROM "ClauseKnowledgeChunk"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}
    `;

    return chunks.map(
      (chunk) =>
        `[${chunk.source} – ${chunk.title}]\n${chunk.content}`
    );
  } catch (error) {
    // pgvector might not be installed in dev — return empty context
    console.warn('Vector search failed (pgvector may not be installed):', error);
    return getFallbackContext(queryText);
  }
}

function getFallbackContext(queryText: string): string[] {
  // Provide basic UCP 600 context when vector search is unavailable
  const lowerQuery = queryText.toLowerCase();
  const fallbacks: string[] = [];

  if (lowerQuery.includes('document') || lowerQuery.includes('examination')) {
    fallbacks.push(
      '[UCP600_ART14 – Standard for Examination of Documents]\nBanks must examine documents on their face to determine compliance. Examination period is 5 banking days.'
    );
  }
  if (lowerQuery.includes('payment') || lowerQuery.includes('sight') || lowerQuery.includes('usance')) {
    fallbacks.push(
      '[UCP600_ART7 – Issuing Bank Undertaking]\nAn issuing bank is irrevocably bound to honour a complying presentation from the moment it issues the credit.'
    );
  }
  if (lowerQuery.includes('shipment') || lowerQuery.includes('transport') || lowerQuery.includes('bill of lading')) {
    fallbacks.push(
      '[UCP600_ART20 – Bill of Lading]\nA bill of lading must appear to indicate the name of the carrier and be signed by the carrier, master, or agent.'
    );
  }
  if (lowerQuery.includes('soft') || lowerQuery.includes('inspection') || lowerQuery.includes('approval')) {
    fallbacks.push(
      '[UCP600_ART4 – Credits vs. Contracts]\nA credit is a separate transaction from the sale or other contract. Banks deal with documents and not with goods, services or performance.'
    );
    fallbacks.push(
      '[UCP600_ART5 – Documents vs. Goods]\nBanks deal with documents and not with goods, services or performance to which the documents may relate.'
    );
  }

  return fallbacks.length > 0
    ? fallbacks
    : [
        '[UCP600_ART14 – Standard for Examination]\nBanks must examine documents on their face within 5 banking days following the day of presentation.',
        '[UCP600_ART4 – Credits vs. Contracts]\nA credit is independent from the underlying contract of sale.',
      ];
}

export async function countKnowledgeChunks(): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "ClauseKnowledgeChunk"
  `;
  return Number(result[0]?.count ?? 0);
}
