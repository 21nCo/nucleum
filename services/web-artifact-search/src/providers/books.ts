import type { WebArtifactSearchQuery, WebArtifactSearchResult, WebArtifact } from "../types";
import { buildHasMore, clampLimit, createEmptyResult, ensureQuery } from "./utils";

const OPEN_LIBRARY_BASE = process.env.OPEN_LIBRARY_BASE ?? "https://openlibrary.org";

export async function searchBooks(
  params: WebArtifactSearchQuery
): Promise<WebArtifactSearchResult> {
  const query = ensureQuery(params.query);
  if (!query) {
    return createEmptyResult(params);
  }

  const limit = clampLimit(params.limit, 50, 10);
  const page = Math.max(1, params.page ?? 1);

  try {
    const url = new URL(`${OPEN_LIBRARY_BASE}/search.json`);
    url.searchParams.set("q", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("fields", "key,title,author_name,first_publish_year,cover_i,subject,edition_count");

    const response = await fetch(url);
    if (!response.ok) {
      console.warn("OpenLibrary search failed", response.status, await response.text());
      return createEmptyResult(params);
    }

    type OpenLibraryDoc = {
      key: string;
      title: string;
      author_name?: string[];
      first_publish_year?: number;
      cover_i?: number;
      subject?: string[];
      edition_count?: number;
    };

    type OpenLibraryResult = {
      num_found: number;
      docs: OpenLibraryDoc[];
    };

    const data = (await response.json()) as OpenLibraryResult;
    const items: WebArtifact[] = (data.docs ?? []).map((doc) => {
      const authors = doc.author_name ?? [];
      const cover = doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : undefined;
      const openLibraryUrl = `${OPEN_LIBRARY_BASE}${doc.key}`;
      return {
        id: `openlibrary:${doc.key}`,
        category: "BOOKS",
        title: doc.title,
        subtitle: authors.join(", "),
        releaseDate: doc.first_publish_year
          ? String(doc.first_publish_year)
          : undefined,
        thumbnailUrl: cover,
        tags: (doc.subject ?? []).slice(0, 6),
        externalUrl: openLibraryUrl,
        providers: [
          {
            id: "openlibrary",
            name: "Open Library",
            url: openLibraryUrl
          }
        ],
        raw: {
          editionCount: doc.edition_count
        }
      } satisfies WebArtifact;
    });

    const total = data.num_found ?? items.length;

    return {
      items,
      total,
      page,
      limit,
      hasMore: buildHasMore(total, page, limit)
    };
  } catch (error) {
    console.error("OpenLibrary search error", error);
    return createEmptyResult(params);
  }
}
