import type {
  WebArtifact,
  WebArtifactSearchResult,
  WebArtifactSearchQuery
} from "../types";
import { searchMovies } from "../providers/movies";
import { searchBooks } from "../providers/books";
import { searchPodcasts } from "../providers/podcasts";
import { searchRecipes } from "../providers/recipes";
import { searchVideos } from "../providers/videos";
import { searchArticles } from "../providers/articles";

export interface WebArtifactRepository {
  search(params: WebArtifactSearchQuery): Promise<WebArtifactSearchResult>;
}

const EMPTY_RESULT = (
  params: WebArtifactSearchQuery
): WebArtifactSearchResult => ({
  items: [],
  total: 0,
  page: params.page ?? 1,
  limit: params.limit ?? 10,
  hasMore: false
});

class ProviderWebArtifactRepository implements WebArtifactRepository {
  async search(params: WebArtifactSearchQuery): Promise<WebArtifactSearchResult> {
    const category = params.category;
    switch (category) {
      case "MOVIES":
        return searchMovies(params);
      case "BOOKS":
        return searchBooks(params);
      case "PODCASTS":
        return searchPodcasts(params);
      case "RECIPES":
        return searchRecipes(params);
      case "VIDEOS":
        return searchVideos(params);
      case "ARTICLES":
        return searchArticles(params);
      default:
        return EMPTY_RESULT(params);
    }
  }
}

export const webArtifactRepository: WebArtifactRepository =
  new ProviderWebArtifactRepository();
