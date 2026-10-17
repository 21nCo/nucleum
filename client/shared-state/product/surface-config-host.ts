import type { Product } from "@nucleum/client/config/product.type";
import type { Resource } from "@nucleum/datafn/resource.enum";

/** Product fields consumed by account, settings, and library surfaces. */
export type ProductSurfaceConfig = {
  settings?: {
    children: string[];
    isHideTitle?: boolean;
    orientation?: "horizontal" | "vertical";
    section: string;
  }[];
  oAuthProviders?: ("google" | "apple" | "github")[];
  resources: { browse: Resource[] };
  librarySectionLabel?: string;
};

let resolveConfig: ((product?: Product) => ProductSurfaceConfig) | undefined;

/** Installs product fields at the application composition boundary. */
export function configureSurfaceProductConfig(
  resolve: (product?: Product) => ProductSurfaceConfig
) {
  resolveConfig = resolve;
}

/** Resolves the configured product fields for a surface. */
export function requireSurfaceProductConfig(product?: Product) {
  if (!resolveConfig) {
    throw new Error("Surface product config has not been configured");
  }
  return resolveConfig(product);
}
