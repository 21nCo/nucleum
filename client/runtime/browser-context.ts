import { get } from "svelte/store";

import { Embed, OperatingSystem } from "@nucleum/client/runtime/context.type";

import context from "@nucleum/client/runtime/context.store";

import { detectSystemOS, detectTouchDevice } from "@21n/shared-utils/browser-platform";

import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";

/** Detects browser and native-host context without product composition dependencies. */
export async function initializeBrowserContext(url: URL) {
  const ctx = { ...get(context) };
  const isDebugEmbedMode = import.meta.env?.VITE_IS_DEBUG_EMBED === "true";
  let browserAgent = navigator?.userAgent;
  if (isDebugEmbedMode || browserAgent.includes("embed")) {
    ctx.isEmbed = true;
  }
  const isDebugHandheldMode = import.meta.env?.VITE_IS_DEBUG_HANDSET === "true";
  if (browserAgent.includes("handset") || isDebugHandheldMode) {
    ctx.embed = Embed.HANDSET;
  } else if (browserAgent.includes("tablet")) {
    ctx.embed = Embed.TABLET;
  } else {
    ctx.embed = Embed.DESKTOP;
  }
  let isSheet = url?.searchParams?.get("isSheet");

  if (isSheet) {
    ctx.isSheet = true;
  }
  ctx.os = detectSystemOS() as OperatingSystem;
  ctx.isTouchDevice = detectTouchDevice();
  ctx.protocol = window.location.protocol;
  const isInOfflineMode = await clientStorage.get(
    ClientStorageKey.OFFLINE_MODE
  );
  ctx.isInOfflineMode = isInOfflineMode === "true" || !navigator.onLine;
  const isInLowDataMode = await clientStorage.get(
    ClientStorageKey.LOW_DATA_MODE
  );
  if (isInLowDataMode) ctx.isInLowDataMode = isInLowDataMode === "true";

  context.set(ctx);
}
