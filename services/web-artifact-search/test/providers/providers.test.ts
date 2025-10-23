import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { searchMovies } from "../../src/providers/movies";
import { searchBooks } from "../../src/providers/books";
import { searchPodcasts } from "../../src/providers/podcasts";
import { searchRecipes } from "../../src/providers/recipes";
import { searchVideos } from "../../src/providers/videos";
import { searchArticles } from "../../src/providers/articles";

const ORIGINAL_ENV = { ...process.env };

function mockFetchOnce(data: unknown, init: ResponseInit = { status: 200 }) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify(data), init));
}

describe("provider searches", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  describe("searchMovies", () => {
    it("returns empty result when query is missing", async () => {
      const result = await searchMovies({ category: "MOVIES", query: "" });
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("maps TMDB response", async () => {
      process.env.TMDB_API_KEY = "movie-key";
      const spy = mockFetchOnce({
        page: 1,
        total_results: 1,
        results: [
          {
            id: 42,
            title: "Inception",
            overview: "Dreams within dreams",
            release_date: "2010-07-16",
            poster_path: "/poster.jpg",
            vote_average: 8.8,
            vote_count: 1000,
            popularity: 90
          }
        ]
      });

      const result = await searchMovies({ category: "MOVIES", query: "Inception", limit: 5 });
      expect(spy).toHaveBeenCalledTimes(1);
      const url = new URL(spy.mock.calls[0][0] as string);
      expect(url.searchParams.get("query")).toBe("Inception");
      expect(result.items[0]).toMatchObject({
        id: "tmdb:42",
        title: "Inception",
        rating: 8.8,
        externalUrl: expect.stringContaining("42")
      });
    });
  });

  describe("searchBooks", () => {
    it("maps Open Library response", async () => {
      const spy = mockFetchOnce({
        num_found: 1,
        docs: [
          {
            key: "/works/OL12345W",
            title: "The Pragmatic Programmer",
            author_name: ["Andrew Hunt", "David Thomas"],
            first_publish_year: 1999,
            cover_i: 1001,
            subject: ["Programming", "Software"]
          }
        ]
      });

      const result = await searchBooks({ category: "BOOKS", query: "Pragmatic" });
      expect(spy).toHaveBeenCalled();
      expect(result.items[0]).toMatchObject({
        id: "openlibrary:/works/OL12345W",
        title: "The Pragmatic Programmer",
        subtitle: "Andrew Hunt, David Thomas",
        externalUrl: expect.stringContaining("/works/OL12345W")
      });
    });
  });

  describe("searchPodcasts", () => {
    it("returns empty when API key missing", async () => {
      delete process.env.LISTEN_NOTES_API_KEY;
      const result = await searchPodcasts({ category: "PODCASTS", query: "tech" });
      expect(result.items).toHaveLength(0);
    });

    it("maps ListenNotes response", async () => {
      process.env.LISTEN_NOTES_API_KEY = "pod-key";
      const spy = mockFetchOnce({
        total: 1,
        results: [
          {
            id: "hard-fork",
            title_original: "Hard Fork",
            publisher_original: "New York Times",
            image: "https://img.com/podcast.jpg",
            thumbnail: "",
            description_original: "Tech podcast",
            total_episodes: 100,
            rss: "http://rss.com",
            listennotes_url: "https://www.listennotes.com/hard-fork/"
          }
        ]
      });

      const result = await searchPodcasts({ category: "PODCASTS", query: "fork" });
      expect(spy).toHaveBeenCalled();
      expect(result.items[0]).toMatchObject({
        id: "listennotes:hard-fork",
        title: "Hard Fork",
        externalUrl: "https://www.listennotes.com/hard-fork/"
      });
    });
  });

  describe("searchRecipes", () => {
    it("maps Spoonacular response", async () => {
      process.env.SPOONACULAR_API_KEY = "food-key";
      const spy = mockFetchOnce({
        totalResults: 1,
        results: [
          {
            id: 555,
            title: "Shakshuka",
            readyInMinutes: 30,
            image: "https://img.com/recipe.jpg",
            sourceUrl: "https://source.com/shakshuka",
            summary: "Delicious",
            diets: ["Vegetarian"],
            dishTypes: ["Breakfast"],
            servings: 4
          }
        ]
      });

      const result = await searchRecipes({ category: "RECIPES", query: "shakshuka" });
      expect(spy).toHaveBeenCalled();
      expect(result.items[0]).toMatchObject({
        id: "spoonacular:555",
        title: "Shakshuka",
        externalUrl: "https://source.com/shakshuka",
        durationMinutes: 30
      });
    });
  });

  describe("searchVideos", () => {
    it("maps YouTube response with details", async () => {
      process.env.YOUTUBE_API_KEY = "yt-key";
      const searchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              pageInfo: { totalResults: 1 },
              items: [
                {
                  id: { videoId: "abc123" },
                  snippet: {
                    title: "Svelte Tutorial",
                    channelTitle: "Svelte Society",
                    description: "Learn Svelte",
                    publishTime: "2024-05-01T00:00:00Z",
                    thumbnails: {
                      high: { url: "https://img.youtube.com/vi/abc123/hqdefault.jpg" }
                    }
                  }
                }
              ]
            })
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              items: [
                {
                  id: "abc123",
                  contentDetails: { duration: "PT1H30M" }
                }
              ]
            })
          )
        );

      const result = await searchVideos({ category: "VIDEOS", query: "svelte" });
      expect(searchSpy).toHaveBeenCalledTimes(2);
      expect(result.items[0]).toMatchObject({
        id: "youtube:abc123",
        title: "Svelte Tutorial",
        durationMinutes: 90,
        externalUrl: expect.stringContaining("abc123")
      });
    });
  });

  describe("searchArticles", () => {
    it("maps NewsAPI response", async () => {
      process.env.NEWSAPI_KEY = "news-key";
      const spy = mockFetchOnce({
        status: "ok",
        totalResults: 1,
        articles: [
          {
            title: "AI in Design",
            author: "Jane Doe",
            description: "Exploring AI",
            url: "https://news.com/article",
            urlToImage: "https://news.com/image.jpg",
            publishedAt: "2025-01-01T00:00:00Z",
            source: {
              id: "news",
              name: "News Source"
            }
          }
        ]
      });

      const result = await searchArticles({ category: "ARTICLES", query: "AI" });
      expect(spy).toHaveBeenCalled();
      expect(result.items[0]).toMatchObject({
        id: "newsapi:https://news.com/article",
        title: "AI in Design",
        externalUrl: "https://news.com/article",
        providers: [
          expect.objectContaining({ name: "News Source" })
        ]
      });
    });
  });
});
