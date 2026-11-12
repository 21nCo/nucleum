import { enumToString, properCase } from "@21n/shared-utils/text.utils";
import {
  ContextMenuType,
  type IContextMenu,
  type IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import type { ResourceSearchHit } from "@nucleum/shared-state/resources/resource-search";
import { highlightSearchQuery } from "@nucleum/features/memory/linking/search-results.utils";
import type { ICommandAction } from "@nucleum/surfaces/commandBar/cmd.type";

/** What the super bar shows: commands with search results, or results only. */
export type SuperBarScope = "all" | "search";

/** One runnable item of the open resource's "..." menu. */
export type ContextActionItem = {
  key: string;
  label: string;
  icon?: string;
  item: IContextMenuItem;
  isToggleGroup?: boolean;
};

/** One row of the super bar list, in display and keyboard order. */
export type SuperBarEntry =
  | { kind: "context"; key: string; action: ContextActionItem }
  | { kind: "command"; key: string; action: ICommandAction }
  | { kind: "result"; key: string; hit: ResourceSearchHit };

/** Commands shown above the search results while a query is typed. */
export const SUPER_BAR_COMMAND_LIMIT = 5;

/** Prefix that narrows the super bar to commands only. */
export const SUPER_BAR_COMMANDS_PREFIX = ">";

/**
 * Reads a typed `>` prefix: returns the query without it when the input
 * starts with the prefix, otherwise undefined.
 */
export function resolveCommandsPrefix(value: string): string | undefined {
  if (!value.startsWith(SUPER_BAR_COMMANDS_PREFIX)) return undefined;
  return value.slice(SUPER_BAR_COMMANDS_PREFIX.length).trimStart();
}

function resolveContextItemLabel(item: IContextMenuItem) {
  if (item.type === ContextMenuType.SWITCH) {
    const label = item.label ?? properCase(enumToString(String(item.value)));
    return item.initialValue ? `${label}: on` : `${label}: off`;
  }
  if (item.label) return item.label;
  return item.value != null ? properCase(enumToString(String(item.value))) : "";
}

/**
 * Flattens a resource context menu into the items the super bar can run
 * directly. Items that need a second-step picker or are disabled are left to
 * the menu itself. Items with neither a callback nor a command are kept only
 * when the page handles item values itself, except switches outside a toggle
 * group, which the menu never reports to the page.
 */
export function flattenContextActions(
  menu: IContextMenu,
  options: { hasActionHandler?: boolean } = {}
): ContextActionItem[] {
  const seen = new Set<string>();
  return menu.flatMap((group) =>
    group.items
      .filter((item) => !item.isDisabled && !item.secondStepComponent)
      .filter(
        (item) =>
          item.callback ||
          item.action ||
          (options.hasActionHandler &&
            (item.type !== ContextMenuType.SWITCH || group.isToggleGroup))
      )
      .map((item) => ({
        key: `${group.group}:${String(item.value)}`,
        label: resolveContextItemLabel(item),
        icon: typeof item.icon === "string" ? item.icon : undefined,
        item,
        isToggleGroup: Boolean(group.isToggleGroup)
      }))
      .filter((action) => {
        if (!action.label || seen.has(action.key)) return false;
        seen.add(action.key);
        return true;
      })
  );
}

/** Keeps the actions whose label contains the query, ignoring case. */
export function filterContextActions(
  actions: ContextActionItem[],
  query: string
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return actions;
  return actions.filter((action) =>
    action.label.toLowerCase().includes(normalized)
  );
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;"
};

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * Prepares a search hit for its super bar row: the label falls back to the
 * event title or name, and the highlighted title and body excerpt are
 * HTML-escaped because the row renders them as Markdown HTML.
 */
export function toSuperBarSearchHit(
  hit: ResourceSearchHit,
  query: string
): ResourceSearchHit {
  const label = [hit.record.label, hit.record.event, hit.record.name].find(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const [record] = highlightSearchQuery(
    [label === undefined ? hit.record : { ...hit.record, label }],
    query
  );
  return {
    ...hit,
    record: {
      ...record,
      labelSearch:
        typeof record.labelSearch === "string"
          ? escapeHtml(record.labelSearch)
          : record.labelSearch,
      bodySearch:
        typeof record.bodySearch === "string"
          ? escapeHtml(record.bodySearch)
          : record.bodySearch
    }
  };
}

/**
 * Orders the super bar rows: the open resource's actions, then commands, then
 * search results, without duplicate rows. While typing, commands are capped
 * so results stay reachable.
 */
export function buildSuperBarEntries(params: {
  query: string;
  scope: SuperBarScope;
  contextActions: ContextActionItem[];
  commands: ICommandAction[];
  results: ResourceSearchHit[];
  /** Lists every matching command and nothing else. */
  isCommandsOnly?: boolean;
}): SuperBarEntry[] {
  const isTyping = params.query.trim().length > 0;
  if (params.isCommandsOnly) {
    return params.commands.map((action) => ({
      kind: "command",
      key: `command:${action.action}:${action.variant ?? ""}`,
      action
    }));
  }
  if (params.scope === "search") {
    return params.results.map((hit) => ({
      kind: "result",
      key: `result:${hit.id}`,
      hit
    }));
  }
  const commands = isTyping
    ? params.commands.slice(0, SUPER_BAR_COMMAND_LIMIT)
    : params.commands;
  const seen = new Set<string>();
  const entries: SuperBarEntry[] = [
    ...filterContextActions(params.contextActions, params.query).map(
      (action): SuperBarEntry => ({
        kind: "context",
        key: `context:${action.key}`,
        action
      })
    ),
    ...commands.map((action): SuperBarEntry => ({
      kind: "command",
      key: `command:${action.action}:${action.variant ?? ""}`,
      action
    })),
    ...(isTyping ? params.results : []).map((hit): SuperBarEntry => ({
      kind: "result",
      key: `result:${hit.id}`,
      hit
    }))
  ];
  return entries.filter((entry) => {
    if (seen.has(entry.key)) return false;
    seen.add(entry.key);
    return true;
  });
}

/**
 * Runs a contextual action the way the resource menu does: a switch toggles
 * its value, and a switch from a toggle group also notifies the page's action
 * handler; otherwise the item callback starts, or its command runs when it has
 * no callback, and the page's action handler receives the item value before
 * the callback is awaited.
 */
export async function runContextAction(
  action: ContextActionItem,
  handlers: {
    runCommand: (command: string) => unknown;
    onAction?: (value: IContextMenuItem["value"]) => void;
  }
) {
  const { item } = action;
  if (item.type === ContextMenuType.SWITCH) {
    const pending = item.callback?.(!item.initialValue);
    if (action.isToggleGroup) handlers.onAction?.(item.value);
    await pending;
    return;
  }
  if (item.callback) {
    const pending = item.callback();
    handlers.onAction?.(item.value);
    await pending;
    return;
  }
  if (item.action) handlers.runCommand(item.action);
  handlers.onAction?.(item.value);
}
