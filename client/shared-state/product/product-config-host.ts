/**
 * Product-wide navigation chrome configuration shared with the application
 * shell. The composition root installs the full product config; the shell only
 * reads the narrow navigation fields it needs, keeping product assembly in
 * `client/products`.
 */
export type ProductNavConfig = {
  appMenu: string[];
  appMenuPt: string[];
  homePath: string;
  homePathPt: string;
  isShowCaptureOnMobile?: boolean;
};

let productConfig: ProductNavConfig | undefined;

/**
 * Installs the resolved product navigation config from `configure-hosts.ts`.
 */
export function configureProductConfigHost(value: ProductNavConfig) {
  productConfig = value;
}

/**
 * Reads the installed product navigation config. Throws when the composition
 * root has not configured the host.
 */
export function requireProductConfig(): ProductNavConfig {
  if (!productConfig)
    throw new Error("Product config host has not been configured");
  return productConfig;
}
