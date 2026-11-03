import { Action } from "@nucleum/client/config/action.enum";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { memotronActions } from "@nucleum/products/memotron/memotron.actions";
import { pointronActions } from "@nucleum/products/pointron/pointron.actions";
import NucleusLibrary from "@nucleum/products/nucleus/NucleusLibrary.svelte";
import NucleusOverview from "@nucleum/products/nucleus/overview/NucleusOverview.svelte";
import ComingSoonView from "@21n/ui/elements/ComingSoonView.svelte";
import LibraryPanelContentResolver from "@nucleum/surfaces/library/LibraryPanelContentResolver.svelte";
import { Resource } from "@nucleum/datafn/resource.enum";
import NucleusOverviewPanel from "@nucleum/products/nucleus/overview/NucleusOverviewPanel.svelte";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { appMenuActionLabelsByAction } from "@nucleum/client/config/product-nav.config";
import ResourceBrowser from "@nucleum/surfaces/library/resourceBrowser/ResourceBrowser.svelte";
import { createPageViewActions } from "@nucleum/shared-state/commands/page-view-actions";
import { createLibraryViewActions } from "@nucleum/surfaces/library/library-route";
import { resolveLibrarySwitcherResources } from "@nucleum/surfaces/library/resource-switcher.utils";
import { resolveNucleusOverviewViewSegments } from "@nucleum/products/nucleus/overview/nucleus-overview-views";
import { resolveProductConfig } from "@nucleum/products/product.config";
import { Product } from "@nucleum/client/config/product.type";

const actionsToFilterInSub: string[] = [Action.LIBRARY, Action.OVERVIEW];

function isSubProductAction(action: IAction) {
  return (
    !actionsToFilterInSub.includes(action.action) &&
    !actionsToFilterInSub.includes(action.subViewOf ?? "")
  );
}

const libraryAction: IAction = {
  action: Action.LIBRARY,
  label: appMenuActionLabelsByAction[Action.LIBRARY],
  icon: "library",
  component: LibraryPanelContentResolver,
  panel: NucleusLibrary,
  type: ActionType.PAGE,
  componentParams: {
    defaultResource: Resource.collection,
    resources: resolveProductConfig(Product.NUCLEUM).resources?.browse ?? [
      Resource.collection
    ]
  }
};

const overviewAction: IAction = {
  action: Action.OVERVIEW,
  label: appMenuActionLabelsByAction[Action.OVERVIEW],
  icon: "overview",
  component: NucleusOverview,
  // panel: NucleusOverviewPanel,
  type: ActionType.PAGE
};

export const nucleusActions: IAction[] = [
  ...memotronActions.filter(isSubProductAction),
  ...pointronActions.filter(isSubProductAction),
  libraryAction,
  ...createLibraryViewActions(
    libraryAction,
    resolveLibrarySwitcherResources(
      (product) => resolveProductConfig(product).resources?.browse ?? [],
      import.meta.env?.DEV || false
    )
  ),
  overviewAction,
  ...createPageViewActions(
    overviewAction,
    resolveNucleusOverviewViewSegments()
  ),
  {
    action: Action.HOME,
    label: appMenuActionLabelsByAction[Action.HOME],
    icon: "home",
    component: ComingSoonView,
    type: ActionType.PAGE
  },
  {
    action: Action.FEED,
    label: "Feed",
    icon: "feed",
    component: ComingSoonView,
    type: ActionType.LIVE,
    accessMode: AccessMode.PANEL,
    liveActionParams: {
      isOpeningBehaviorConfigurable: true
    }
  },
  {
    action: resourceAction(Resource.space, ResourceActionType.BROWSE),
    label:
      appMenuActionLabelsByAction[
        resourceAction(Resource.space, ResourceActionType.BROWSE)
      ],
    icon: "combination",
    component: ResourceBrowser,
    type: ActionType.PAGE,
    componentParams: {
      resource: Resource.space
    }
  }
];
