import { enumToString, properCase } from "@21n/shared-utils/text.utils";
import {
  ContextMenuType,
  type IContextMenu,
  type IContextMenuItem
} from "@21n/ui/elements/contextMenu/context-menu.type";
import type { ResourceSearchHit } from "@nucleum/shared-state/resources/resource-search";
import type { ICommandAction } from "@nucleum/surfaces/commandBar/cmd.type";

/** What the super bar shows: commands with search results, or results only. */
export type SuperBarScope = "all" | "search";

/** One runnable item of the open resource's "..." menu. */
export type ContextActionItem = {
  key: string;
  label: string;
  icon?: string;
  item: IContextMenuItem;
};

/** One row of the super bar list, in display and keyboard order. */
export type SuperBarEntry =
  | { kind: "context"; key: string; action: ContextActionItem }
  | { kind: "command"; key: string; action: ICommandAction }
  | { kind: "result"; key: string; hit: ResourceSearchHit };

/** Commands shown above the search results while a query is typed. */
export const SUPER_BAR_COMMAND_LIMIT = 5;

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
 * the menu itself.
 */
export function flattenContextActions(menu: IContextMenu): ContextActionItem[] {
  const seen = new Set<string>();
  return menu.flatMap((group) =>
    group.items
      .filter((item) => !item.isDisabled && !item.secondStepComponent)
      .filter((item) => item.callback || item.action)
      .map((item) => ({
        key: `${group.group}:${String(item.value)}`,
        label: resolveContextItemLabel(item),
        icon: typeof item.icon === "string" ? item.icon : undefined,
        item
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
}): SuperBarEntry[] {
  const isTyping = params.query.trim().length > 0;
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
 * its value; otherwise the item callback runs, or its command when it has no
 * callback, and the page's action handler then receives the item value.
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
    await item.callback?.(!item.initialValue);
    return;
  }
  if (item.callback) {
    await item.callback();
  } else if (item.action) {
    handlers.runCommand(item.action);
  }
  handlers.onAction?.(item.value);
}
