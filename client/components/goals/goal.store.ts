import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { StoreDataType, type IRecordId } from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { recentsStore } from "../record/recent.store";
import type { IActiveGoal, IGoal } from "./goal.type";
import { GoalType } from "./goal.type";
import {
  ResourceAccessMode,
  ResourceAccessPoint
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

class GoalStore extends ResourceStore<IGoal> {
  constructor() {
    super(Resource.goal);
  }

  async save(
    form: OmitForCapture<IGoal>,
    additionalParams?: {
      subTasks?: string[];
      context?: string;
    }
  ) {
    const id = generateResourceId(Resource.goal);
    logger.log({ at: "GoalStore.save", form });

    let subTaskIds: IRecordId[] = [];
    let subTasks: OmitForCaptureWithId<IGoal>[] = [];
    if (additionalParams?.subTasks && additionalParams.subTasks.length > 0) {
      subTasks = additionalParams.subTasks.map((subTask) => ({
        id: generateResourceId(Resource.goal),
        label: subTask,
        type: GoalType.INDEFINITE,
        parent: [id],
        isCompleted: false,
        accessMode: ResourceAccessMode.POP
      }));
      subTaskIds = subTasks.map((subTask) => subTask.id);
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
      children: subTaskIds,
      subGoalsLayout: form.subGoalsLayout
    };

    recentsStore.add(resource, {
      type: Resource.goal,
      timestamp: new Date()
    });

    return this.create([resource, ...subTasks], additionalParams);
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
}

export const goalStore = new GoalStore();

export class ActiveGoalStore extends CollectibleStore<IActiveGoal, GoalStore> {
  constructor(goalId: IRecordId) {
    super(goalId, goalStore);
  }

  async init(accessMode: ResourceAccessMode) {
    logger.log({ at: "ActiveGoalStore.init", id: this.id });
    try {
      const result = await this.resourceStore.select(this.id, [
        "*",
        "(select * from $parent.children) as children",
        "(select * from $parent.parent) as parent",
        "->link.* as outlinks",
        "<-link.* as inlinks"
      ]);
      logger.debug({ at: "ActiveGoalStore.init - select", result });

      if (!result) {
        this.set({
          id: this.id,
          label: "",
          type: GoalType.INDEFINITE,
          modifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          accessMode,
          isPageLoading: false
        });
        return;
      }
      const collections: IRecordId[] = result.outlinks
        .filter((x: any) => x.out.tb === Resource.collection)
        .map((x: any) => x.out);
      console.log({
        at: "ActiveGoalStore.init",
        result,
        collections
      });

      this.set({
        ...result,
        collections,
        isPageLoading: false,
        accessMode
      });

      recentsStore.add(result, {
        type: Resource.goal,
        timestamp: new Date()
      });
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
      if (get(activeSession).isSessionRunning)
        await activeSession.finishSession(true);
      await activeSession.quickStart(this.goal.id);
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
  return [
    {
      group: "primary",
      items: [...primaryItems]
    },
    {
      group: "focus",
      items: [goalActions.focusNow, goalActions.pinToQuickFocus()]
    },
    {
      group: "open",
      items: [
        resourceActions.openAsTab(),
        resourceActions.openAsSplit(),
        resourceActions.openAsFull()
      ]
    },
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}
