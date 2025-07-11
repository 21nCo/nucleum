import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import {
  StoreDataType,
  type IRecordId,
  type IResourceSelectAdditionalParams,
  type IResourceSelectParams
} from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import type { IActiveGoal, IGoal } from "./goal.type";
import { GoalType } from "./goal.type";
import {
  ResourceAccessMode,
  ResourceAccessPoint,
  ResourceActionType
} from "../flux/resourceStores/resource.type";
import type {
  OmitForCapture,
  OmitForCaptureWithId
} from "../flux/resourceStores/resource.type";
import { ResourceActions } from "../record/resource.actions";
import {
  ContextMenuType,
  type IContextMenu,
  type IContextMenuItem
} from "$lib/client/types/select.type";
import { CollectibleStore } from "../collection/collectible.store";
import { activeSession } from "$lib/client/products/pointron/focus/session.store";
import { get } from "svelte/store";
import { appStore } from "$lib/client/stores/app.store";
import context from "$lib/client/stores/context.store";
import { Embed } from "$lib/client/types/context.type";
import view from "$lib/client/stores/view.store";
import { collectionStore } from "../collection/collection.store";
import { AppSearchParam } from "$lib/client/types/appStore.type";
import { toasts } from "$lib/client/stores/notification.store";
import { resourceAction } from "../flux/resourceStores/resource.utils";
import { taskStore } from "../tasks/task.store";

class GoalStore extends ResourceStore<IGoal> {
  constructor() {
    super(Resource.goal);
  }

  selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    const expandedProps = ["*", "(select * from $parent.parent) as parent"];
    const properties = [
      ...(additionalParams?.isExpand ? expandedProps : []),
      ...(params?.properties ?? [])
    ];
    const filters = {
      ...(params?.filters ?? {}),
      type:
        params?.filters && "type" in params.filters && params?.filters?.type
          ? params.filters.type?.toUpperCase()
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
      properties,
      filters
    };
    return super.selectMany(params, additionalParams);
  }

  async save(
    form: OmitForCapture<IGoal>,
    additionalParams?: {
      subGoals?: string[];
      context?: string;
    }
  ) {
    const id = generateResourceId(Resource.goal);
    logger.log({ at: "GoalStore.save", form });

    let subGoalIds: IRecordId[] = [];
    let subGoals: OmitForCaptureWithId<IGoal>[] = [];
    if (additionalParams?.subGoals && additionalParams.subGoals.length > 0) {
      subGoals = additionalParams.subGoals.map((subGoal) => ({
        id: generateResourceId(Resource.goal),
        label: subGoal,
        type: GoalType.INDEFINITE,
        parent: [id],
        isCompleted: false,
        accessMode: ResourceAccessMode.POP
      }));
      subGoalIds = subGoals.map((subGoal) => subGoal.id);
    }

    const resource: OmitForCaptureWithId<IGoal> = {
      id,
      label: form.label || "",
      type: form.type || GoalType.INDEFINITE,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      spanScale: form.spanScale,
      parent: form.parent,
      color: form.color,
      children: subGoalIds,
      subGoalsLayout: form.subGoalsLayout
    };

    appStore.addToRecents({
      record: resource,
      type: Resource.goal,
      timestamp: new Date()
    });

    return this.create([resource, ...subGoals], additionalParams);
  }

  async createNew(params?: {
    isQuickFocus?: boolean;
    context?: string;
    label?: string;
    isPreventOpenAfterCreate?: boolean;
    linkSearchParam?: string;
  }) {
    const id = generateResourceId(Resource.goal);
    const goal: OmitForCaptureWithId<IGoal> = {
      id,
      label: params?.label ?? "",
      isPinnedForQuickFocus: params?.isQuickFocus,
      type: GoalType.INDEFINITE
    };
    const result = await this.create([goal], {
      context:
        params?.context ??
        resourceAction(Resource.goal, ResourceActionType.CREATE)
    });
    if (result) {
      toasts.success("New goal created successfully");
    }
    if (params?.isPreventOpenAfterCreate) return;
    appStore.openResource(id, ResourceAccessMode.POP, {
      searchParams: {
        [AppSearchParam.EDIT]: true,
        [AppSearchParam.LINK]: params?.linkSearchParam ?? null
      }
    });
  }

  async addSubGoalWithContext(
    src: IRecordId[],
    subGoal: {
      label: string;
      type?: GoalType;
    },
    currentSubGoals?: IRecordId[]
  ) {
    const goal = {
      id: generateResourceId(Resource.goal),
      label: subGoal.label,
      type: subGoal.type ?? GoalType.INDEFINITE,
      parent: [...src]
    };
    await this.modify(
      src[src.length - 1],
      {
        children: [...(currentSubGoals || []), goal.id]
      },
      {
        isPreventBackPropagation: true
      }
    );
    console.log({ at: "GoalStore.addSubGoalWithContext", goal });
    return this.create([goal]);
  }

  async addSubGoal(
    src: IRecordId,
    subGoal: {
      label: string;
      type?: GoalType;
    }
  ) {
    const goalData: IGoal = await this.select(src);
    if (!goalData) return;
    this.addSubGoalWithContext(
      [...(goalData.parent || []), src],
      subGoal,
      goalData.children
    );
  }

  private async resolveDependencies(ids: IRecordId[]) {
    const subGoalsResult = await Promise.all([
      ...ids.map((id) =>
        super.selectMany(
          {
            properties: ["id"],
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
        properties: ["id"],
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
}

export const goalStore = new GoalStore();

export class ActiveGoalStore extends CollectibleStore<IActiveGoal, GoalStore> {
  constructor(goalId: IRecordId) {
    super(goalId, goalStore);
  }

  async init(
    accessMode: ResourceAccessMode,
    params?: { isInEditMode?: boolean; linkSearchParam?: string }
  ) {
    logger.log({ at: "ActiveGoalStore.init", id: this.id });
    try {
      const result = await this.resourceStore.select(this.id, [
        "*",
        "(select * from $parent.children) as children",
        "(select * from $parent.parent) as parent",
        "(select id from task where goalId is $parent.id) as tasks",
        "->link.* as outlinks",
        "<-link.* as inlinks"
      ]);

      if (!result) {
        this.set({
          id: this.id,
          label: "",
          type: GoalType.INDEFINITE,
          modifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          accessMode,
          ...(params?.isInEditMode && { isInEditMode: true }),
          isPageLoading: false
        });
        return;
      }
      const collections: IRecordId[] = result.outlinks
        .filter((x: any) => x.out.tb === Resource.collection)
        .map((x: any) => x.out);
      const types = await collectionStore.resolveTypes(collections);

      console.log({
        at: "ActiveGoalStore.init",
        result,
        collections,
        types
      });

      this.set({
        ...result,
        types,
        collections,
        isPageLoading: false,
        accessMode,
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
}

export type IActiveGoalStore = InstanceType<typeof ActiveGoalStore>;

class GoalActions {
  constructor(
    private goal: IGoal,
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
    icon: "ph:circle-light",
    callback: async () => {
      await activeSession.focusGoal(this.goal.id);
    }
  };

  pinToQuickFocus() {
    return {
      value: "pinToQuickFocus",
      label: "Pin to quick focus",
      icon: "ph:circle-light",
      type: ContextMenuType.SWITCH,
      initialValue: this.goal.isPinnedForQuickFocus,
      callback: async (checked) => {
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

export function resolveGoalContextMenu(
  goal: IGoal,
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
  const openingActionGroup = {
    group: "open",
    items: [
      resourceActions.openAsTab(),
      ...(accessPoint !== ResourceAccessPoint.SELF
        ? [resourceActions.openAsSplit()]
        : []),
      resourceActions.openAsFull()
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
