import { Arrangement } from "@21n/ui/elements/direction.enum";
import { Resource } from "@nucleum/datafn/resource.enum";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { enumToString } from "@21n/shared-utils/text.utils";

type LibraryPanePresentation = {
  resource: Resource;
  selectedSubType: string;
  displayedCount: number;
  isStarFilterSelected: boolean;
  searchQuery: string;
  hasChildren: boolean;
};

function resolveResourceLabel(
  input: LibraryPanePresentation,
  isPlural = false
) {
  let label = "items";
  if (input.resource === Resource.everything) label = "item";
  else if (input.selectedSubType && input.selectedSubType !== "all") {
    let text = enumToString(input.selectedSubType).toLowerCase();
    if (input.selectedSubType === NodeType.NODULAR_MARKDOWN.toLowerCase()) {
      text = "markdown";
    }
    label = ` ${text} ${input.resource}`;
  } else label = input.resource;
  return label + (input.displayedCount > 1 || isPlural ? "s" : "");
}

/** Resolves the record count feedback shown beneath a library pane. */
export function resolveLibraryFooterMessage(
  data: unknown[],
  totalCount: number,
  input: LibraryPanePresentation
) {
  if (!data || !data.length) return;
  const visibleCount =
    typeof totalCount === "number"
      ? Math.min(data.length, totalCount)
      : data.length;
  const label = resolveResourceLabel(input);
  if (input.isStarFilterSelected) {
    return `Showing ${visibleCount}  ⭐️ staaarrrrrred ${label} ${input.hasChildren ? "including sub " + label : ""}`;
  }
  if (input.searchQuery) {
    return `Showing ${visibleCount}  ${label} containing "${input.searchQuery}"`;
  }
  return `Showing ${visibleCount} of ${totalCount ?? "Unknown"} ${label}`;
}

/** Resolves the empty result copy for a library pane. */
export function resolveLibraryEmptyStateMessage(
  input: LibraryPanePresentation
) {
  const label = resolveResourceLabel(input, true);
  if (input.isStarFilterSelected) {
    return {
      mainText: `No starred ${label} found.`,
      subText: `Please star some ${label} to see them here.`
    };
  }
  if (input.searchQuery) {
    return {
      mainText: `No ${label} found.`,
      subText: `Please try a different search or create a new ${input.resource}.`
    };
  }
  if (input.resource === Resource.node) {
    return {
      mainText: `Looks like you don't have any ${label} yet.`,
      subText:
        "Please create nodes using capture or install our chrome extension to clip from web."
    };
  }
  return {
    mainText: `Looks like you don't have any ${label} yet.`,
    subText: "Please create one."
  };
}

/** Chooses the library arrangement from the view width and resource kind. */
export function resolveLibraryArrangement(input: {
  arrangement?: Arrangement | null;
  isConstrainedWidth: boolean;
  resource: Resource;
}) {
  if (input.arrangement) return input.arrangement;
  if (input.isConstrainedWidth) {
    return input.resource === Resource.node
      ? Arrangement.GRID
      : Arrangement.LIST;
  }
  return input.resource === Resource.task ? Arrangement.LIST : Arrangement.GRID;
}
