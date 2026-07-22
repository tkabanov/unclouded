/** US-403 — tag matching and daily article selection (mirrors SQL RPC helpers). */

export interface InsightArticleCandidate {
  id: string;
  classificationKey: string | null;
  primaryPillar: string | null;
  nervousSystem: string | null;
}

export interface UserInsightContext {
  classificationKey: string | null;
  primaryPillar: string | null;
  nervousSystem: string | null;
}

export function articleMatchesUser(
  article: InsightArticleCandidate,
  user: UserInsightContext,
): boolean {
  if (article.classificationKey != null) {
    if (!user.classificationKey || article.classificationKey !== user.classificationKey) {
      return false;
    }
  }

  if (article.primaryPillar != null) {
    if (
      !user.primaryPillar ||
      article.primaryPillar.trim().toLowerCase() !== user.primaryPillar.trim().toLowerCase()
    ) {
      return false;
    }
  }

  if (article.nervousSystem != null) {
    if (!user.nervousSystem || article.nervousSystem !== user.nervousSystem) {
      return false;
    }
  }

  return true;
}

export function scoreArticleMatch(
  article: InsightArticleCandidate,
  user: UserInsightContext,
): number {
  if (!articleMatchesUser(article, user)) return -1;

  let score = 0;

  if (article.classificationKey != null && article.classificationKey === user.classificationKey) {
    score += 4;
  } else if (article.classificationKey == null) {
    score += 1;
  }

  if (
    article.primaryPillar != null &&
    user.primaryPillar &&
    article.primaryPillar.trim().toLowerCase() === user.primaryPillar.trim().toLowerCase()
  ) {
    score += 4;
  } else if (article.primaryPillar == null) {
    score += 1;
  }

  if (article.nervousSystem != null && article.nervousSystem === user.nervousSystem) {
    score += 4;
  } else if (article.nervousSystem == null) {
    score += 1;
  }

  return score;
}

export function selectDailyInsightArticleIds(
  articles: InsightArticleCandidate[],
  user: UserInsightContext,
  recentlyShownIds: ReadonlySet<string>,
  limit = 3,
): string[] {
  const eligible = articles
    .filter((article) => !recentlyShownIds.has(article.id) && articleMatchesUser(article, user))
    .map((article) => ({
      id: article.id,
      score: scoreArticleMatch(article, user),
    }))
    .sort((left, right) => right.score - left.score);

  const picked = eligible.slice(0, limit).map((entry) => entry.id);
  if (picked.length >= limit) return picked;

  const fallback = articles
    .filter((article) => !recentlyShownIds.has(article.id) && !picked.includes(article.id))
    .map((article) => article.id);

  return [...picked, ...fallback].slice(0, limit);
}
