import type { Component } from "svelte";
import type { Size } from "@21n/ui/elements/size.enum";

type ProductLogo = Component<{
  subatom?: string;
  size?: Size.sm | Size.md | Size.xs;
  isShowAnimation?: boolean;
  variant?: "accent" | "subtle" | "primary";
}>;

type AppLoadingView = Component<{
  message?: string;
  subMessage?: string;
  duration?: number;
  percentage?: number;
}>;

let productLogo: ProductLogo | undefined;
let appLoadingView: AppLoadingView | undefined;

/** Installs the connected product visuals before application surfaces mount. */
export function configureProductPresentation(input: {
  logo: ProductLogo;
  loadingView: AppLoadingView;
}) {
  productLogo = input.logo;
  appLoadingView = input.loadingView;
}

/** Returns the product logo selected by application composition. */
export function requireProductLogo(): ProductLogo {
  if (!productLogo) throw new Error("Product logo has not been configured");
  return productLogo;
}

/** Returns the loading view selected by application composition. */
export function requireAppLoadingView(): AppLoadingView {
  if (!appLoadingView)
    throw new Error("App loading view has not been configured");
  return appLoadingView;
}
