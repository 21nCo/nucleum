import { IS_PRODUCT_PAGE, SITE } from "$env/static/private";
import {
  features,
  categories,
  contemporaries
} from "$lib/client/landing/memotron.io/compare/memotronWheel";

export const prerender = IS_PRODUCT_PAGE === "true" && SITE === "Memotron";

export function load() {
  return {
    isProductPage: IS_PRODUCT_PAGE,
    features,
    categories,
    contemporaries
  };
}
