import type { WebArtifactSearchQuery, WebArtifactSearchResult, WebArtifact } from "../types";
import {
  buildHasMore,
  clampLimit,
  createEmptyResult,
  ensureQuery,
  isoDurationToMinutes
} from "./utils";

const YOUTUBE_API_BASE = process.env.YOUTUBE_API_BASE ?? "https://www.googleapis.com/youtube/v3";
const YOUTUBE_WATCH_BASE = process.env.YOUTUBE_WATCH_BASE ?? "https://www.youtube.com/watch";

export async function searchVideos(
  params: WebArtifactSearchQuery
): Promise<WebArtifactSearchResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const query = ensureQuery(params.query);
  if (!apiKey || !query) {
    return createEmptyResult(params);
  }

  const limit = clampLimit(params.limit, 25, 10);
  const page = Math.max(1, params.page ?? 1);
  if (page > 1) {
    // For now, YouTube Data API v3 pagination via pageToken is non-trivial without state.
    // Returning empty keeps behaviour predictable until we add token support.
    return createEmptyResult({ ...params, page });
  }

  try {
    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", String(limit));
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("key", apiKey);

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      console.warn("YouTube search failed", searchResponse.status, await searchResponse.text());
      return createEmptyResult(params);
    }

    type YouTubeSearchItem = {
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        description: string;
        thumbnails: Record<string, { url: string }>;
        publishTime?: string;
      };
    };

    type YouTubeSearchResponse = {
      items: YouTubeSearchItem[];
      pageInfo: {
        totalResults: number;
      };
    };

    const searchData = (await searchResponse.json()) as YouTubeSearchResponse;
    const ids = (searchData.items ?? []).map((item) => item.id.videoId).filter(Boolean);

    let durations: Record<string, number | undefined> = {};

    if (ids.length > 0) {
      const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
      detailsUrl.searchParams.set("part", "contentDetails,statistics");
      detailsUrl.searchParams.set("id", ids.join(","));
      detailsUrl.searchParams.set("key", apiKey);

      const detailsResponse = await fetch(detailsUrl);
      if (detailsResponse.ok) {
        type DetailsItem = {
          id: string;
          contentDetails?: { duration?: string };
          statistics?: { viewCount?: string };
        };
        type DetailsResponse = { items: DetailsItem[] };
        const detailsData = (await detailsResponse.json()) as DetailsResponse;
        durations = Object.fromEntries(
          (detailsData.items ?? []).map((item) => [
            item.id,
            isoDurationToMinutes(item.contentDetails?.duration)
          ])
        );
      } else {
        console.warn("YouTube details failed", detailsResponse.status, await detailsResponse.text());
      }
    }

    const items: WebArtifact[] = (searchData.items ?? []).map((item) => {
      const id = item.id.videoId;
      const snippet = item.snippet;
      const thumb = snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url;
      const watchUrl = `${YOUTUBE_WATCH_BASE}?v=${id}`;
      return {
        id: `youtube:${id}`,
        category: "VIDEOS",
        title: snippet.title,
        subtitle: snippet.channelTitle,
        description: snippet.description ?? undefined,
        releaseDate: snippet.publishTime ?? undefined,
        thumbnailUrl: thumb,
        durationMinutes: durations[id],
        externalUrl: watchUrl,
        providers: [
          {
            id: "youtube",
            name: "YouTube",
            url: watchUrl
          }
        ]
      } satisfies WebArtifact;
    });

    const total = searchData.pageInfo?.totalResults ?? items.length;

    return {
      items,
      total,
      page,
      limit,
      hasMore: buildHasMore(total, page, limit) && total > items.length
    };
  } catch (error) {
    console.error("YouTube search error", error);
    return createEmptyResult(params);
  }
}
