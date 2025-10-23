import type { WebArtifactSearchQuery, WebArtifactSearchResult, WebArtifact } from "../types";
import { buildHasMore, clampLimit, createEmptyResult, ensureQuery } from "./utils";

const NEWS_API_BASE = process.env.NEWS_API_BASE ?? "https://newsapi.org/v2";

export async function searchArticles(
  params: WebArtifactSearchQuery
): Promise<WebArtifactSearchResult> {
  const apiKey = process.env.NEWSAPI_KEY ?? process.env.NEWS_API_KEY;
  const query = ensureQuery(params.query);
  if (!apiKey || !query) {
    return createEmptyResult(params);
  }

  const limit = clampLimit(params.limit, 50, 10);
  const page = Math.max(1, params.page ?? 1);

  try {
    const url = new URL(`${NEWS_API_BASE}/everything`);
    url.searchParams.set("q", query);
    url.searchParams.set("pageSize", String(limit));
    url.searchParams.set("page", String(page));
    url.searchParams.set("language", process.env.NEWS_API_LANGUAGE ?? "en");
    url.searchParams.set("sortBy", process.env.NEWS_API_SORT ?? "relevancy");

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": apiKey
      }
    });

    if (!response.ok) {
      console.warn("NewsAPI search failed", response.status, await response.text());
      return createEmptyResult(params);
    }

    type NewsArticle = {
      title: string;
      author?: string;
      description?: string;
      url: string;
      urlToImage?: string;
      publishedAt?: string;
      source?: {
        id?: string;
        name?: string;
      };
      content?: string;
    };

    type NewsResponse = {
      status: string;
      totalResults: number;
      articles: NewsArticle[];
    };

    const data = (await response.json()) as NewsResponse;
    if (data.status !== "ok") {
      console.warn("NewsAPI status not ok", data);
      return createEmptyResult(params);
    }

    const items: WebArtifact[] = (data.articles ?? []).map((article, index) => ({
      id: `newsapi:${article.url ?? `${page}-${index}`}`,
      category: "ARTICLES",
      title: article.title ?? "Untitled",
      subtitle: article.author ?? article.source?.name ?? undefined,
      description: article.description ?? article.content ?? undefined,
      externalUrl: article.url,
      thumbnailUrl: article.urlToImage ?? undefined,
      releaseDate: article.publishedAt ?? undefined,
      tags: article.source?.name ? [article.source.name] : undefined,
      providers: [
        {
          id: article.source?.id ?? "newsapi",
          name: article.source?.name ?? "News API",
          url: article.url
        }
      ]
    } satisfies WebArtifact));

    const total = data.totalResults ?? items.length;
    return {
      items,
      total,
      page,
      limit,
      hasMore: buildHasMore(total, page, limit)
    };
  } catch (error) {
    console.error("NewsAPI search error", error);
    return createEmptyResult(params);
  }
}
