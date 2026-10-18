import type { Component } from "svelte";

export interface ElementActionHost {
  /** Requests navigation through the composing application's routing policy. */
  navigate?(href: string): void;
  openLink(href: string): void;
  renderer: Component<{ path?: string; params?: any }>;
  runAction(action: string, params?: any): any;
}

let host: ElementActionHost | undefined;

/** Installs application actions used by portable interactive elements. */
export function configureElementActionHost(value: ElementActionHost) {
  host = value;
}

/** Returns the optional action host supplied by the composing application. */
export function getElementActionHost() {
  return host;
}
