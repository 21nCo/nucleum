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

const URL_PATTERN = /\b[a-z][a-z\d+.-]*:\/\/[^\s"'<>()]+/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const BEARER_PATTERN = /\bBearer\s+[^\s"',;]+/gi;
const JWT_PATTERN = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const SECRET_PARAM_PATTERN =
  /\b(token|access_token|refresh_token|api_key|apikey|key|secret|password)=[^\s&"']+/gi;

/**
 * Removes account identity and secrets from free text such as error
 * messages: URLs keep only their origin, and email addresses, bearer
 * tokens, JWTs and secret query parameters are replaced.
 */
export function sanitizeDiagnosticText(text: string): string {
  return text
    .replace(URL_PATTERN, (url) => resolveOrigin(url) ?? "[url]")
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(JWT_PATTERN, "[redacted]")
    .replace(SECRET_PARAM_PATTERN, "$1=[redacted]")
    .replace(EMAIL_PATTERN, "[email]");
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === undefined || value === null || value === "") return "-";
  const text = sanitizeDiagnosticText(
    String(value).replace(/\s+/g, " ").trim()
  );
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
    const origin = new URL(url).origin;
    return origin === "null" ? undefined : origin;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the storage usage summary. It is asynchronous, so callers resolve
 * it ahead of a clipboard write to keep the click's user activation.
 */
export async function resolveStorageEstimate() {
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
 * tokens or full URLs. It is synchronous so a click handler can write the
 * report to the clipboard without losing user activation (WebKit).
 */
export function collectDiagnosticSections(
  storage?: string
): DiagnosticSection[] {
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
        storage
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
