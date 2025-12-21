import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "@21n/components/flux/resourceStores/resource.store";
import { PanelSwitcherMixin } from "@21n/components/resource/panelSwitcher.mixin";
import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
import {
  type IRecordId,
  type IResourceSelectAdditionalParams,
  type IResourceSelectParams
} from "@21n/types/data.type";
import { generateResourceId } from "@21n/components/flux/flux.utils";
import { logger } from "@21n/components/debug/logger.client";
import type {
  IActiveGoal,
  IGoal,
  IGoalCapture,
  IGoalThumb
} from "@21n/components/goals/goal.type";
import { GoalStatus, GoalType } from "@21n/components/goals/goal.type";
import {
  AccessMode,
  ResourceAccessPoint,
  ResourceActionType
} from "@21n/components/flux/resourceStores/resource.type";
import { ResourceActions } from "@21n/components/record/resource.actions";
import {
  ContextMenuType,
  type IContextMenu,
  type IContextMenuItem
} from "@21n/types/select.type";
import { CollectibleStore } from "@21n/components/collection/collectible.store";
import { activeSession } from "@21n/products/pointron/focus/session.store";
import { get } from "svelte/store";
import { appStore } from "@21n/stores/app.store";
import context from "@21n/stores/context.store";
import { Embed } from "@21n/types/context.type";
import view from "@21n/stores/view.store";
import { collectionStore } from "@21n/components/collection/collection.store";
import { AppSearchParam } from "@21n/types/appStore.type";
import { toasts } from "@21n/stores/notification.store";
import {
  isSameResource,
  resolveResourceIcon,
  resourceAction,
  resourceInList
} from "@21n/components/flux/resourceStores/resource.utils";
import { taskStore } from "@21n/components/tasks/task.store";
import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";

const defaults: Partial<IGoal> = {
  type: GoalType.INDEFINITE,
  status: GoalStatus.NOT_STARTED,
  parent: 0,
  isPinnedForQuickFocus: false
};
class GoalStore extends ResourceStore<IGoal, IGoalCapture> {
  constructor() {
    super(Resource.goal, {
      defaultProps: defaults,
      expandProps: ["parent"]
    });
  }

  selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    const filters = {
      ...(params?.filters ?? {}),
      type:
        params?.filters && "type" in params.filters && params?.filters?.type
          ? typeof params.filters.type === "string"
            ? params.filters.type.toUpperCase()
            : params.filters.type
          : undefined,
      parent: params?.filters?.parent
        ? params?.filters?.parent
        : params?.search ||
            additionalParams?.isIncludeSubItems ||
            params?.filters?.isStarred ||
            params?.filters?.id
          ? undefined
          : false
    };
    params = {
      ...(params ?? {}),
      filters
    };
    return super.selectMany(params, additionalParams);
  }

  /**
   * TODO
   * addToRecents() is not implemented for goals due to the nature of the goal saving process - the label will always be empty during creation of goal due to inplace creation
   */
  async save(params?: {
    isQuickFocus?: boolean;
    context?: string;
    label?: string;
    isPreventOpenAfterCreate?: boolean;
    linkSearchParam?: string;
  }) {
    const goal = {
      label: params?.label ?? "",
      isPinnedForQuickFocus: params?.isQuickFocus ?? false
    };
    const result = await this.create([goal], {
      context:
        params?.context ??
        resourceAction(Resource.goal, ResourceActionType.CREATE)
    });
    if (!result || result.length === 0) {
      toasts.error("Failed to create new goal");
      return;
    }
    toasts.success("New goal created successfully");
    if (params?.isPreventOpenAfterCreate) return result[0];
    appStore.openResource(result[0].id, AccessMode.POP, {
      searchParams: {
        [AppSearchParam.EDIT]: true,
        [AppSearchParam.LINK]: params?.linkSearchParam ?? null
      }
    });
    return result[0];
  }

  /**
   * Adds a sub goal to the source goal
   * @param subGoal - the sub goal to add
   * @param srcId - the source goal id
   * @param params - additional parameters
   * @param params.srcExpanded - the source goal expanded data
   * @returns the sub goal id
   */
  async addSubGoal(
    subGoal: {
      label: string;
      type?: GoalType;
    },
    srcId: IRecordId,
    params?: {
      srcExpanded?: IActiveGoal;
    }
  ) {
    let parent: IRecordId[] | undefined = undefined;
    let children: IRecordId[] = [];
    if (params?.srcExpanded === undefined) {
      const goalData: IGoal = await this.select(srcId);
      if (goalData) {
        parent = [...(goalData.parent || []), srcId];
        children = goalData.children || [];
      }
    } else {
      parent = [...(params.srcExpanded?.parent || []).map((p) => p.id), srcId];
      children = [...(params.srcExpanded?.children || [])].map((c) => c.id);
    }
    const goal: IGoalCapture = {
      id: generateResourceId(Resource.goal),
      label: subGoal.label,
      parent,
      ...(subGoal.type && { type: subGoal.type })
    };
    await this.modify(
      srcId,
      {
        children: [...(children || []), goal.id as IRecordId]
      },
      {
        isPreventBackPropagation: true
      }
    );
    console.log({ at: "GoalStore.addSubGoal", goal });
    return this.create([goal]);
  }

  private async resolveDependencies(ids: IRecordId[]) {
    const subGoalsResult = await Promise.all([
      ...ids.map((id) =>
        super.selectMany(
          {
            properties: {
              select: ["id"]
            },
            filters: {
              parent: {
                contains: id.toString()
              }
            }
          },
          {
            isIncludeInactiveItems: true
          }
        )
      )
    ]);
    const subGoals = subGoalsResult.flat();
    const tasks = await taskStore.selectMany(
      {
        properties: {
          select: ["id"]
        },
        filters: {
          goalId: [
            ...ids.map((id) => id.toString()),
            ...(subGoals?.map((g) => g.id.toString()) ?? [])
          ]
        }
      },
      {
        isIncludeInactiveItems: true
      }
    );
    return [tasks, subGoals];
  }

  private async onParentChange(ids: IRecordId[], status: boolean) {
    const [tasks, subGoals] = await this.resolveDependencies(ids);
    if (subGoals?.length) {
      await this.bulkModify(
        subGoals.map((g: IGoal) => g.id),
        { isParentInactive: status }
      );
    }
    if (tasks?.length) {
      await taskStore.bulkModify(
        tasks.map((task: { id: IRecordId }) => task.id),
        { isParentInactive: status }
      );
    }
  }

  async onArchive(ids: IRecordId[]) {
    return this.onParentChange(ids, true);
  }

  async onUnarchive(ids: IRecordId[]) {
    return this.onParentChange(ids, false);
  }

  async onTrash(ids: IRecordId[]) {
    return this.onParentChange(ids, true);
  }

  async onRestore(ids: IRecordId[]) {
    return this.onParentChange(ids, false);
  }

  async convertToRoot(src: IGoalThumb) {
    logger.log({ at: "GoalStore.convertToRoot", src });
    await this.editParentChain(src);
    await this.removeSubgoalFromCurrentParent(src);
  }

  async convertToSubGoal(src: IGoalThumb, parent: IGoal) {
    logger.log({ at: "GoalStore.convertToSubGoal", src, parent });
    const result = await this.editParentChain(src, parent);
    if (!result) return;
    await this.appendSubgoal(src, parent);
  }

  async moveSubgoal(src: IGoalThumb, parent: IGoal) {
    logger.log({ at: "GoalStore.moveSubgoal", src, parent });
    const result = await this.editParentChain(src, parent);
    if (!result) return;
    await this.appendSubgoal(src, parent);
    await this.removeSubgoalFromCurrentParent(src);
  }

  /**
   * Removes the sub goal (src) from the current parent (children array)
   * @param src - the sub goal to remove
   * @returns
   */
  private async removeSubgoalFromCurrentParent(src: IGoalThumb) {
    if (!src) return;
    const immediateParent = src.parent?.[src.parent.length - 1];
    if (!immediateParent) return;
    const currentChildren = immediateParent.children;
    if (!currentChildren?.some(resourceInList(src))) {
      toasts.error();
      return;
    }
    const newChildren = currentChildren
      .filter((x) => !isSameResource(x, src))
      .filter(Boolean);
    await this.modify(immediateParent.id, {
      children: newChildren
    });
  }

  /**
   * Adds the sub goal (src) to the new parent (children array)
   * @param src - the sub goal to add
   * @param newParent - the new parent to add the sub goal to
   * @returns
   */
  private async appendSubgoal(src: IGoalThumb, newParent: IGoal) {
    if (!src || !newParent) return;
    const currentChildren = newParent.children;
    if (currentChildren?.some(resourceInList(src.id))) {
      toasts.error("Goal is already a subgoal of this parent");
      return;
    }
    const newChildren = [...(currentChildren || []), src.id];
    await this.modify(newParent.id, {
      children: newChildren
    });
  }

  /**
   * Edits all the parent fields of deeply nested sub goals of the source goal (src) to prepend the new parent (newParent) and its parent hierarchy.
   * @param src
   * @param newParent
   * @returns
   */
  private async editParentChain(
    src: IGoalThumb,
    newParent?: IGoal | IGoalThumb
  ) {
    const subGoals: IGoal[] = await this.selectMany(
      {
        filters: {
          parent: {
            contains: src.id.toString()
          }
        }
      },
      {
        isIncludeInactiveItems: true
      }
    );
    const newParentHierarchy = [
      ...(newParent?.parent
        ? newParent.parent.map((x) =>
            typeof x === "string" ? x : x.id?.toString()
          )
        : []),
      ...(newParent ? [newParent.id] : [])
    ].filter(Boolean);
    await this.modify(src.id, {
      parent:
        newParentHierarchy && newParentHierarchy.length > 0
          ? newParentHierarchy
          : defaults.parent
    });
    if (!isValidArrayWithData(subGoals)) return true;
    if (newParent && subGoals.some(resourceInList(newParent))) return false;
    for (const subGoal of subGoals) {
      let parentChainToRight: IRecordId[] | undefined = undefined;
      if (subGoal.parent) {
        const srcIndexInParentChain = subGoal.parent
          ?.map((x) => x.toString())
          .indexOf(src.id.toString());
        parentChainToRight = subGoal.parent?.slice(srcIndexInParentChain);
      }
      const newParentChainForSubGoal = [
        ...newParentHierarchy,
        ...(parentChainToRight || [])
      ].filter(Boolean);
      await this.modify(subGoal.id, {
        parent:
          newParentChainForSubGoal && newParentChainForSubGoal.length > 0
            ? newParentChainForSubGoal
            : defaults.parent
      });
    }
    return true;
  }
}

export const goalStore = GoalStore.resolve(Resource.goal);

export class ActiveGoalStore extends CollectibleStore<
  IGoal,
  GoalStore,
  IActiveGoal
> {
  constructor(goalId: IRecordId) {
    super(goalId, goalStore);
  }

  async init(
    accessMode: AccessMode,
    params?: {
      isInEditMode?: boolean;
      linkSearchParam?: string;
      panel?: string;
    }
  ) {
    logger.log({ at: "ActiveGoalStore.init", id: this.id, params });
    try {
      const oldProps = [
        "*",
        "(select * from $parent.children) as children",
        "(select * from $parent.parent) as parent",
        "(select id from task where goalId is $parent.id) as tasks",
        "->link.* as outlinks",
        "<-link.* as inlinks"
      ];
      const result = await this.resourceStore.select(this.id, {
        expand: ["children", "parent"]
      });
      if (!result) {
        this.set({
          id: this.id,
          label: "",
          type: GoalType.INDEFINITE,
          modifiedAt: new Date(),
          createdAt: new Date(),
          accessMode,
          panel: params?.panel ?? ResourcePanelType.DEFAULT,
          ...(params?.isInEditMode && { isInEditMode: true }),
          isPageLoading: false
        });
        return;
      }
      let types = [];
      if (result.collections && result.collections.length > 0)
        types = await collectionStore.resolveTypes(result.collections);

      this.set({
        ...result,
        types,
        isPageLoading: false,
        accessMode,
        panel: params?.panel ?? ResourcePanelType.DEFAULT,
        ...(params?.isInEditMode && { isInEditMode: true })
      });

      appStore.addToRecents({
        record: result,
        type: Resource.goal,
        timestamp: new Date()
      });
      if (params?.linkSearchParam) {
        this.linkCollection(params.linkSearchParam);
      }
    } catch (e) {
      console.error("error in init goal store", {
        id: this.id,
        error: e
      });
    }
  }

  async afterInit() {
    const taskCount = await taskStore.selectMany({
      properties: {
        select: ["#"]
      },
      filters: {
        goalId: this.id
      }
    });
    if (!taskCount || typeof taskCount !== "number") return;
    this.update((state) => {
      return {
        ...state,
        taskCount: taskCount
      };
    });
  }

  switchPanel!: (panel: string) => void;

  static resolve(id: IRecordId): IActiveGoalStore {
    if (!ActiveGoalStore.prototype.switchPanel) {
      ActiveGoalStore.prototype.switchPanel = PanelSwitcherMixin.switchPanel;
    }

    const instance = super.resolve.call(this, id) as any;

    if (!instance.switchPanel) {
      instance.switchPanel = PanelSwitcherMixin.switchPanel;
    }

    return instance;
  }
}

export type IActiveGoalStore = InstanceType<typeof ActiveGoalStore>;

const goalStaticPanelActions = {
  infoPane: {
    value: ResourcePanelType.DEFAULT,
    icon: "info",
    label: "Info",
    tooltip: "Show info"
  },
  subGoalsPane: {
    value: ResourcePanelType.SUB,
    icon: resolveResourceIcon(Resource.goal),
    label: "Sub goals",
    tooltip: "Show sub goals"
  },
  tasksPane: {
    value: ResourcePanelType.TASKS,
    icon: resolveResourceIcon(Resource.task),
    label: "Tasks",
    tooltip: "Show tasks"
  },
  analyticsPane: {
    value: ResourcePanelType.ANALYTICS,
    icon: "chart",
    label: "Analytics",
    tooltip: "Show analytics"
  },
  activityPane: {
    value: ResourcePanelType.ACTIVITY,
    icon: "activity",
    label: "Activity",
    tooltip: "Show activity"
  },
  propertiesPane: {
    value: ResourcePanelType.PROPERTIES,
    icon: "shapes",
    label: "Properties",
    tooltip: "Show properties"
  },
  linksPane: {
    value: ResourcePanelType.LINKS,
    icon: "link",
    label: "Links",
    tooltip: "Show links"
  }
};

class GoalActions {
  constructor(
    private goal: IGoalThumb,
    private store: GoalStore,
    private accessPoint: ResourceAccessPoint
  ) {}

  share = {
    value: "share",
    icon: "share",
    callback: async () => {}
  };

  focusNow = {
    value: "focusNow",
    label: "Focus now",
    icon: "circle",
    callback: async () => {
      await activeSession.focusGoal(this.goal.id);
    }
  };

  convertToSubGoal = {
    value: PointronAction.CONVERT_TO_SUBGOAL,
    label: "Convert to sub goal",
    icon: "to-sub",
    callback: async () => {
      appStore.runAction(PointronAction.SELECT_PARENT_GOAL, {
        componentParams: {
          src: this.goal,
          action: PointronAction.CONVERT_TO_SUBGOAL
        }
      });
    }
  };

  moveSubgoal = {
    value: ResourceActionType.MOVE,
    label: "Move",
    icon: "move",
    callback: async () => {
      appStore.runAction(PointronAction.SELECT_PARENT_GOAL, {
        componentParams: {
          src: this.goal,
          action: ResourceActionType.MOVE
        }
      });
    }
  };

  convertToRootGoal = {
    value: PointronAction.CONVERT_TO_ROOT_GOAL,
    label: "Convert to top level goal",
    icon: "level-up",
    callback: async () => {
      return goalStore.convertToRoot(this.goal);
    }
  };

  pinToQuickFocus() {
    return {
      value: "pinToQuickFocus",
      label: "Pin to quick focus",
      icon: "circle",
      type: ContextMenuType.SWITCH,
      initialValue: this.goal.isPinnedForQuickFocus,
      callback: async (checked: boolean) => {
        return this.store.modify(
          this.goal.id,
          {
            isPinnedForQuickFocus: checked
          },
          {
            context: this.accessPoint
          }
        );
      }
    };
  }
}

export function resolvePanelOptions(
  goal: IActiveGoal,
  params?: {
    isConstrainedWidth?: boolean;
    isThreeColumned?: boolean;
  }
) {
  const overview = {
    value: ResourcePanelType.OVERVIEW,
    label: "Overview",
    icon: "overview",
    tooltip: "Show overview"
  };

  let items = [
    goalStaticPanelActions.analyticsPane,
    goalStaticPanelActions.linksPane,
    goalStaticPanelActions.activityPane
  ];

  if (params?.isConstrainedWidth) {
    items.unshift(goalStaticPanelActions.tasksPane);
    items.unshift(goalStaticPanelActions.subGoalsPane);
    items.unshift(goalStaticPanelActions.infoPane);
  } else if (params?.isThreeColumned === false) {
    items.unshift(goalStaticPanelActions.tasksPane);
    items.unshift(goalStaticPanelActions.infoPane);
  } else {
    items.unshift(overview);
  }

  // if (goal?.types && goal?.types?.length > 0) {
  //   items.push(goalStaticPanelActions.propertiesPane);
  // }
  return items;
}

export function resolveGoalContextMenu(
  goal: IGoalThumb,
  accessPoint: ResourceAccessPoint,
  params?: {
    accessPointId?: IRecordId;
  }
): IContextMenu {
  const resourceActions = new ResourceActions(goal, goalStore, accessPoint);
  const goalActions = new GoalActions(goal, goalStore, accessPoint);

  let primaryItems: IContextMenuItem[] = [];

  if (accessPoint === ResourceAccessPoint.SELF) {
    primaryItems = [
      resourceActions.star(),
      resourceActions.edit(accessPoint),
      resourceActions.copyLink()
    ];
  } else if (
    accessPoint === ResourceAccessPoint.COLLECTION &&
    params?.accessPointId
  ) {
    primaryItems = [
      resourceActions.unlink(params?.accessPointId),
      resourceActions.select(accessPoint, params?.accessPointId),
      resourceActions.star(),
      resourceActions.edit(accessPoint),
      resourceActions.copyLink()
    ];
  } else {
    primaryItems = [
      resourceActions.select(accessPoint, params?.accessPointId),
      resourceActions.star(),
      resourceActions.addToCollection(),
      resourceActions.edit(accessPoint),
      resourceActions.copyLink()
    ];
  }
  const isRootGoal =
    !goal.parent || (Array.isArray(goal.parent) && goal.parent?.length === 0);
  if (isRootGoal) {
    primaryItems.push(goalActions.convertToSubGoal);
  } else {
    primaryItems.push(goalActions.convertToRootGoal, goalActions.moveSubgoal);
  }
  const openingActionGroup = {
    group: "open",
    items: [
      resourceActions.openAsTab(),
      ...(accessPoint !== ResourceAccessPoint.SELF
        ? [resourceActions.openAsSplit()]
        : []),
      resourceActions.maximize()
    ]
  };
  const ctx = get(context);
  const viewStore = get(view);
  const isCurrentlyFocusing = activeSession.isCurrentFocusItem(goal.id);
  const focusGroup = {
    group: "focus",
    items: [
      ...(isCurrentlyFocusing ? [] : [goalActions.focusNow]),
      goalActions.pinToQuickFocus()
    ]
  };
  return [
    {
      group: "primary",
      items: [...primaryItems]
    },
    focusGroup,
    ...((ctx.isEmbed && ctx.embed === Embed.HANDSET) ||
    viewStore.isConstrainedWidth
      ? []
      : [openingActionGroup]),
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}
