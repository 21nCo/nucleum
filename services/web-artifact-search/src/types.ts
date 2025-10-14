import { z } from "zod";

export const WebArtifactCategorySchema = z.enum([
  "MOVIES",
  "BOOKS",
  "PODCASTS",
  "RECIPES",
  "VIDEOS",
  "ARTICLES"
]);

export type WebArtifactCategory = z.infer<typeof WebArtifactCategorySchema>;

export const WebArtifactSearchQuerySchema = z.object({
  category: WebArtifactCategorySchema,
  query: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => value ?? ""),
  page: z
    .preprocess((value) => (value === undefined ? undefined : Number(value)), z
      .number()
      .int()
      .min(1)
      .default(1)
    ),
  limit: z
    .preprocess((value) => (value === undefined ? undefined : Number(value)), z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
    )
});

export type WebArtifactSearchQuery = z.infer<typeof WebArtifactSearchQuerySchema>;

export interface WebArtifactProvider {
  id: string;
  name: string;
  url?: string;
}

export interface WebArtifact {
  id: string;
  category: WebArtifactCategory;
  title: string;
  subtitle?: string;
  description?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  rating?: number;
  ratingScale?: number;
  durationMinutes?: number;
  releaseDate?: string;
  providers?: WebArtifactProvider[];
  raw?: Record<string, unknown>;
}

export interface WebArtifactSearchResult {
  items: WebArtifact[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AuthContext {
  token: string;
  payload: any;
}

export type AppBindings = {
  Variables: {
    auth?: AuthContext;
  };
};
