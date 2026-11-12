import { get } from "svelte/store";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import appearance from "@nucleum/shared-state/appearance/appearance.store";
import context from "@nucleum/client/runtime/context.store";
import { nucleumDatafnStatus } from "@nucleum/datafn/datafn.store";
import view from "@21n/ui/environment/view.store";

/** One titled group of diagnostic fields. */
export type DiagnosticSection = {
  title: string;
  fields: Record<string, string | number | boolean | null | undefined>;
};

const MAX_VALUE_LENGTH = 300;

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === undefined || value === null || value === "") return "-";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > MAX_VALUE_LENGTH
    ? `${text.slice(0, MAX_VALUE_LENGTH)}...`
    : text;
}

/**
 * Formats diagnostic sections as plain text for pasting into a support
 * conversation. Missing values print as "-" and long values are shortened.
 */
export function formatDiagnosticReport(
  sections: DiagnosticSection[],
  generatedAt: Date
): string {
  const lines = [`Diagnostic information (${generatedAt.toISOString()})`];
  for (const section of sections) {
    lines.push("", `## ${section.title}`);
    for (const [key, value] of Object.entries(section.fields)) {
      lines.push(`${key}: ${formatValue(value)}`);
    }
  }
  return lines.join("\n");
}

/** Keeps only the origin of a URL so paths and query strings never leak. */
export function resolveOrigin(url: string | null | undefined) {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

async function resolveStorageEstimate() {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate) return undefined;
    const toMb = (bytes?: number) =>
      bytes === undefined ? "?" : (bytes / 1024 / 1024).toFixed(1);
    return `${toMb(estimate.usage)} MB of ${toMb(estimate.quota)} MB`;
  } catch {
    return undefined;
  }
}

/**
 * Collects app, device, sync and appearance details for troubleshooting.
 * It never includes account identity, user content, storage namespaces,
 * tokens or full URLs.
 */
export async function collectDiagnosticSections(): Promise<
  DiagnosticSection[]
> {
  const app = get(appStore);
  const runtimeContext = get(context);
  const sync = get(nucleumDatafnStatus);
  const currentView = get(view);
  const currentAppearance = get(appearance);
  return [
    {
      title: "App",
      fields: {
        product: app.product,
        environment: app.env,
        version: app.version,
        build: app.build,
        path: typeof location === "undefined" ? undefined : location.pathname
      }
    },
    {
      title: "Device",
      fields: {
        userAgent:
          typeof navigator === "undefined" ? undefined : navigator.userAgent,
        language:
          typeof navigator === "undefined" ? undefined : navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        os: runtimeContext.os,
        embed: runtimeContext.embed,
        isEmbed: runtimeContext.isEmbed,
        isTouchDevice: runtimeContext.isTouchDevice,
        viewport:
          typeof window === "undefined"
            ? undefined
            : `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
        isPortrait: currentView.isPortrait,
        storage: await resolveStorageEstimate()
      }
    },
    {
      title: "Sync",
      fields: {
        status: sync.status,
        mode: sync.nucleumMode ?? sync.mode,
        phase: sync.phase,
        online: sync.online,
        pendingChanges: sync.pendingChanges,
        lastSyncAt: sync.lastSyncAt
          ? new Date(sync.lastSyncAt).toISOString()
          : undefined,
        lastError: sync.lastError
          ? String(
              (sync.lastError as { message?: string })?.message ??
                sync.lastError
            )
          : undefined,
        server: resolveOrigin(sync.remoteUrl)
      }
    },
    {
      title: "Appearance",
      fields: {
        colorScheme: currentAppearance?.colorScheme?.id,
        isDark: currentAppearance?.colorScheme?.isDark,
        appStyle: currentAppearance?.appStyle
      }
    }
  ];
}
