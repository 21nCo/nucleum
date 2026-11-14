import { Resource } from "@nucleum/datafn/resource.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import type { IAction } from "@nucleum/shared-state/commands/action.type";

/** A create command offered by the super bar's New list. */
export type NewCommandResult = {
  id: string;
  label: string;
  icon?: string;
};

/**
 * Lists the create commands the product registers, one per resource that has
 * one, whose label contains `query` (ignoring case).
 */
export function resolveNewCommands(
  query: string,
  resolveAction: (slug: string) => IAction | null
): NewCommandResult[] {
  const term = query.trim().toLowerCase();
  const seen = new Set<string>();
  const results: NewCommandResult[] = [];
  for (const resource of Object.values(Resource)) {
    const slug = resourceAction(
      resource as Resource,
      ResourceActionType.CREATE
    );
    if (seen.has(slug)) continue;
    seen.add(slug);
    const action = resolveAction(slug);
    const label =
      typeof action?.cmdLabel === "string" ? action.cmdLabel : action?.label;
    if (!action || !label) continue;
    if (term && !label.toLowerCase().includes(term)) continue;
    results.push({
      id: slug,
      label,
      icon: typeof action.icon === "string" ? action.icon : undefined
    });
  }
  return results;
}
