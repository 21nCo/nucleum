import type { WebArtifactSearchQuery, WebArtifactSearchResult, WebArtifact } from "../types";
import { buildHasMore, clampLimit, createEmptyResult, ensureQuery } from "./utils";

const LISTEN_NOTES_BASE = process.env.LISTEN_NOTES_BASE ?? "https://listen-api.listennotes.com/api/v2";

export async function searchPodcasts(
  params: WebArtifactSearchQuery
): Promise<WebArtifactSearchResult> {
  const apiKey = process.env.LISTEN_NOTES_API_KEY;
  const query = ensureQuery(params.query);
  if (!apiKey || !query) {
    return createEmptyResult(params);
  }

  const limit = clampLimit(params.limit, 20, 10);
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * limit;

  try {
    const url = new URL(`${LISTEN_NOTES_BASE}/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("type", "podcast");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("len_min", "0");
    url.searchParams.set("len_max", "240");
    url.searchParams.set("sort_by_date", "0");

    const response = await fetch(url, {
      headers: {
        "X-ListenAPI-Key": apiKey
      }
    });

    if (!response.ok) {
      console.warn("ListenNotes search failed", response.status, await response.text());
      return createEmptyResult(params);
    }

    type ListenNotesPodcast = {
      id: string;
      title_original: string;
      publisher_original: string;
      image: string;
      thumbnail: string;
      description_original: string;
      total_episodes: number;
      rss: string;
      listennotes_url: string;
    };

    type ListenNotesResponse = {
      total: number;
      count: number;
      results: ListenNotesPodcast[];
    };

    const data = (await response.json()) as ListenNotesResponse;
    const items: WebArtifact[] = (data.results ?? []).slice(0, limit).map((show) => ({
      id: `listennotes:${show.id}`,
      category: "PODCASTS",
      title: show.title_original,
      subtitle: show.publisher_original,
      description: show.description_original ?? undefined,
      thumbnailUrl: show.image || show.thumbnail || undefined,
      tags: ["Podcast"],
      externalUrl: show.listennotes_url,
      providers: [
        {
          id: "listennotes",
          name: "Listen Notes",
          url: show.listennotes_url
        }
      ],
      raw: {
        totalEpisodes: show.total_episodes,
        rss: show.rss
      }
    } satisfies WebArtifact));

    const total = data.total ?? items.length;

    return {
      items,
      total,
      page,
      limit,
      hasMore: buildHasMore(total, page, limit)
    };
  } catch (error) {
    console.error("ListenNotes search error", error);
    return createEmptyResult(params);
  }
}
