import type { WebArtifactSearchQuery, WebArtifactSearchResult } from "../types";

export const createEmptyResult = (
  params: WebArtifactSearchQuery
): WebArtifactSearchResult => ({
  items: [],
  total: 0,
  page: params.page ?? 1,
  limit: params.limit ?? 10,
  hasMore: false
});

export const clampLimit = (limit: number | undefined, max = 20, fallback = 10) => {
  if (!limit || Number.isNaN(limit)) return fallback;
  return Math.max(1, Math.min(limit, max));
};

export function buildHasMore(
  total: number,
  page: number,
  limit: number
): boolean {
  return total > page * limit;
}

export function safeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

export function ensureQuery(query?: string) {
  const trimmed = query?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function isoDurationToMinutes(duration: string | undefined): number | undefined {
  if (!duration) return undefined;
  const regex = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
  const match = duration.match(regex);
  if (!match) return undefined;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return days * 24 * 60 + hours * 60 + minutes + Math.round(seconds / 60);
}
