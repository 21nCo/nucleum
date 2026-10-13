import type { Component } from "svelte";

export interface ElementFile {
  id?: string;
  thumbnailUrl?: string | null;
  url?: string | null;
}

export interface ElementFileHost {
  renderer?: Component<{ id?: string; class?: string }>;
  resolve(
    file: string | ElementFile,
    options?: { isUseThumbnailIfAvailable?: boolean }
  ): Promise<ElementFile | undefined>;
}

let host: ElementFileHost | undefined;

/** Installs file resolution for portable media presentation. */
export function configureElementFileHost(value: ElementFileHost) {
  host = value;
}

/** Returns the optional file host supplied by the composing application. */
export function getElementFileHost() {
  return host;
}

/** Resolves file presentation data through the optional application host. */
export function resolveElementFile(
  file: string | ElementFile,
  options?: { isUseThumbnailIfAvailable?: boolean }
) {
  return getElementFileHost()?.resolve(file, options);
}
