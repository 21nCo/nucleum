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
const BEARER_PATTERN = /\b(Bearer|Basic)\s+[^\s"',;]+/gi;
const JWT_PATTERN = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
/**
 * A secret-like key followed by its value, in query (`token=x`), label
 * (`token: x`) and JSON (`"access_token": "x"`) forms. Keys match in any
 * case and inside camelCase or snake_case names (`accessToken`, `api_key`).
 */
const SECRET_FIELD_PATTERN =
  /(["']?)\b([\w-]*?(?:token|secret|password|passwd|pwd|api[_-]?key|apikey|private[_-]?key|authorization|cookie|credentials?|session[_-]?id|signature|key))\1(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s"',;&}\]]+)/gi;
/** Namespaced account or guest ids and the DataFn database names built from them. */
const NAMESPACE_ID_PATTERN = /(?<![A-Za-z\d])(user|guest)[:_][\w-]{6,}/gi;
const DATAFN_DB_NAME_PATTERN = /\bnucleum-datafn-[\w-]+/gi;
const MIN_IDENTIFIER_LENGTH = 4;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactSecretField(
  _match: string,
  quote: string,
  key: string,
  separator: string,
  value: string
) {
  const valueQuote = /^["']/.test(value) ? value[0] : "";
  return `${quote}${key}${quote}${separator}${valueQuote}[redacted]${valueQuote}`;
}

/**
 * Removes account identity and secrets from free text such as error
 * messages: URLs keep only their origin, and email addresses, bearer and
 * basic credentials, JWTs, secret-like key values, storage namespaces,
 * DataFn database names and the given identifiers are replaced.
 */
export function sanitizeDiagnosticText(
  text: string,
  identifiers: readonly string[] = []
): string {
  let result = text;
  const knownIdentifiers = [...new Set(identifiers)]
    .filter((identifier) => identifier.length >= MIN_IDENTIFIER_LENGTH)
    .sort((a, b) => b.length - a.length);
  for (const identifier of knownIdentifiers) {
    result = result.replace(
      new RegExp(escapeRegExp(identifier), "gi"),
      "[redacted]"
    );
  }
  return result
    .replace(URL_PATTERN, (url) => resolveOrigin(url) ?? "[url]")
    .replace(BEARER_PATTERN, "$1 [redacted]")
    .replace(JWT_PATTERN, "[redacted]")
    .replace(SECRET_FIELD_PATTERN, redactSecretField)
    .replace(DATAFN_DB_NAME_PATTERN, "[database]")
    .replace(NAMESPACE_ID_PATTERN, "$1:[redacted]")
    .replace(EMAIL_PATTERN, "[email]");
}

/**
 * Lists the current storage namespace and database names, in the forms they
 * take inside storage error messages, so the report can redact them.
 */
export function collectDiagnosticIdentifiers(): string[] {
  const { namespace, storageDbName } = get(nucleumDatafnStatus);
  const identifiers: string[] = [];
  if (storageDbName) identifiers.push(storageDbName);
  if (namespace) {
    identifiers.push(namespace, namespace.replace(/:/g, "_"));
    const id = namespace.slice(namespace.indexOf(":") + 1);
    if (id !== namespace) identifiers.push(id);
  }
  return identifiers;
}

function formatValue(
  value: string | number | boolean | null | undefined,
  identifiers: readonly string[]
) {
  if (value === undefined || value === null || value === "") return "-";
  const text = sanitizeDiagnosticText(
    String(value).replace(/\s+/g, " ").trim(),
    identifiers
  );
  return text.length > MAX_VALUE_LENGTH
    ? `${text.slice(0, MAX_VALUE_LENGTH)}...`
    : text;
}

/**
 * Formats diagnostic sections as plain text for pasting into a support
 * conversation. Every value is sanitized, with `identifiers` redacted as well.
 * Missing values print as "-" and long values are shortened.
 */
export function formatDiagnosticReport(
  sections: DiagnosticSection[],
  generatedAt: Date,
  identifiers: readonly string[] = []
): string {
  const lines = [`Diagnostic information (${generatedAt.toISOString()})`];
  for (const section of sections) {
    lines.push("", `## ${section.title}`);
    for (const [key, value] of Object.entries(section.fields)) {
      lines.push(`${key}: ${formatValue(value, identifiers)}`);
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

/**
 * Builds the plain-text report with the current storage namespace and
 * database names redacted. It is synchronous so a click handler can write it
 * to the clipboard within the click's user activation.
 */
export function buildDiagnosticReport(
  storage: string | undefined,
  generatedAt: Date
): string {
  return formatDiagnosticReport(
    collectDiagnosticSections(storage),
    generatedAt,
    collectDiagnosticIdentifiers()
  );
}
