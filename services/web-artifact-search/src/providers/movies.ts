import type { WebArtifactSearchQuery, WebArtifactSearchResult, WebArtifact } from "../types";
import { buildHasMore, clampLimit, createEmptyResult, ensureQuery } from "./utils";

const TMDB_API_BASE = process.env.TMDB_API_BASE ?? "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p/w500";
const TMDB_SITE_BASE = process.env.TMDB_SITE_BASE ?? "https://www.themoviedb.org/movie";

function buildTmdbHeaders() {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  if (bearer) {
    return {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json;charset=utf-8"
    } as HeadersInit;
  }
  return {} as HeadersInit;
}

function buildTmdbUrl(query: string, page: number) {
  const url = new URL(`${TMDB_API_BASE}/search/movie`);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", process.env.TMDB_LANGUAGE ?? "en-US");
  url.searchParams.set("page", String(page));
  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey && !process.env.TMDB_BEARER_TOKEN) {
    url.searchParams.set("api_key", apiKey);
  }
  return url;
}

export async function searchMovies(
  params: WebArtifactSearchQuery
): Promise<WebArtifactSearchResult> {
  const query = ensureQuery(params.query);
  if (!query) {
    return createEmptyResult(params);
  }

  const limit = 20;
  const page = Math.max(1, params.page ?? 1);

  try {
    const url = buildTmdbUrl(query, page);
    const response = await fetch(url, {
      headers: buildTmdbHeaders()
    });

    if (!response.ok) {
      console.warn("TMDB search failed", response.status, await response.text());
      return createEmptyResult(params);
    }

    type TmdbResult = {
      page: number;
      results: Array<{
        id: number;
        title: string;
        overview: string;
        release_date?: string;
        poster_path?: string;
        backdrop_path?: string;
        vote_average?: number;
        vote_count?: number;
        popularity?: number;
      }>;
      total_results: number;
      total_pages: number;
    };

    const data = (await response.json()) as TmdbResult;
    const items: WebArtifact[] = (data.results ?? [])
      .map((movie) => {
        const tmdbUrl = `${TMDB_SITE_BASE}/${movie.id}`;
        return {
          id: `tmdb:${movie.id}`,
          category: "MOVIES",
          title: movie.title,
          description: movie.overview ?? undefined,
          releaseDate: movie.release_date ?? undefined,
          thumbnailUrl: movie.poster_path
            ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
            : movie.backdrop_path
              ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}`
              : undefined,
          rating: movie.vote_average ?? undefined,
          ratingScale: 10,
          externalUrl: tmdbUrl,
          providers: [
            {
              id: "tmdb",
              name: "TMDB",
              url: tmdbUrl
            }
          ],
          raw: {
            voteCount: movie.vote_count,
            popularity: movie.popularity
          }
        } satisfies WebArtifact;
      });

    const total = data.total_results ?? items.length;
    return {
      items,
      total,
      page,
      limit,
      hasMore: buildHasMore(total, page, limit)
    };
  } catch (error) {
    console.error("TMDB search error", error);
    return createEmptyResult(params);
  }
}
