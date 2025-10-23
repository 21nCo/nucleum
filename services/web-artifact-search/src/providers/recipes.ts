import type { WebArtifactSearchQuery, WebArtifactSearchResult, WebArtifact } from "../types";
import { buildHasMore, clampLimit, createEmptyResult, ensureQuery } from "./utils";

const SPOONACULAR_BASE = process.env.SPOONACULAR_BASE ?? "https://api.spoonacular.com";

export async function searchRecipes(
  params: WebArtifactSearchQuery
): Promise<WebArtifactSearchResult> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  const query = ensureQuery(params.query);
  if (!apiKey || !query) {
    return createEmptyResult(params);
  }

  const limit = clampLimit(params.limit, 30, 10);
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * limit;

  try {
    const url = new URL(`${SPOONACULAR_BASE}/recipes/complexSearch`);
    url.searchParams.set("query", query);
    url.searchParams.set("number", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("addRecipeInformation", "true");
    url.searchParams.set("apiKey", apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Spoonacular search failed", response.status, await response.text());
      return createEmptyResult(params);
    }

    type SpoonacularRecipe = {
      id: number;
      title: string;
      readyInMinutes?: number;
      servings?: number;
      image?: string;
      sourceUrl?: string;
      summary?: string;
      diets?: string[];
      dishTypes?: string[];
    };

    type SpoonacularResponse = {
      totalResults: number;
      results: SpoonacularRecipe[];
    };

    const data = (await response.json()) as SpoonacularResponse;
    const items: WebArtifact[] = (data.results ?? []).map((recipe) => {
      const sourceUrl = recipe.sourceUrl ?? undefined;
      return {
        id: `spoonacular:${recipe.id}`,
        category: "RECIPES",
        title: recipe.title,
        description: recipe.summary ?? undefined,
        durationMinutes: recipe.readyInMinutes ?? undefined,
        thumbnailUrl: recipe.image ?? undefined,
        tags: [...(recipe.diets ?? []), ...(recipe.dishTypes ?? [])].slice(0, 6),
        externalUrl: sourceUrl,
        providers: [
          {
            id: "spoonacular",
            name: "Spoonacular",
            url: sourceUrl
          }
        ].filter((provider) => provider.url) as WebArtifact["providers"],
        raw: {
          servings: recipe.servings
        }
      } satisfies WebArtifact;
    });

    const total = data.totalResults ?? items.length;
    return {
      items,
      total,
      page,
      limit,
      hasMore: buildHasMore(total, page, limit)
    };
  } catch (error) {
    console.error("Spoonacular search error", error);
    return createEmptyResult(params);
  }
}
