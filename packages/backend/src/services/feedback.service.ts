import { PrismaClient, Feedback } from '@prisma/client';
import { FeedbackInput, FeedbackSummary } from '@lc-copilot/shared';

const prisma = new PrismaClient();

export async function submitFeedback(
  clauseId: string,
  userId: string,
  input: FeedbackInput
): Promise<Feedback> {
  // Upsert: one feedback per user per clause
  const existing = await prisma.feedback.findFirst({
    where: { clauseId, userId },
  });

  if (existing) {
    return prisma.feedback.update({
      where: { id: existing.id },
      data: { rating: input.rating, comment: input.comment },
    });
  }

  return prisma.feedback.create({
    data: {
      clauseId,
      userId,
      rating: input.rating,
      comment: input.comment,
    },
  });
}

export async function getFeedbackSummary(): Promise<FeedbackSummary> {
  const counts = await prisma.feedback.groupBy({
    by: ['rating'],
    _count: { rating: true },
  });

  const summary: FeedbackSummary = {
    HELPFUL: 0,
    PARTIALLY_HELPFUL: 0,
    NOT_HELPFUL: 0,
    total: 0,
  };

  for (const row of counts) {
    summary[row.rating] = row._count.rating;
    summary.total += row._count.rating;
  }

  return summary;
}
