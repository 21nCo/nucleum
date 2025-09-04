import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import {
  type IRecordId,
  type IResourceSelectAdditionalParams,
  type IResourceSelectParams
} from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import type { ITask, ITaskCapture, ITaskThumb } from "./task.type";
import {
  ResourceAccessMode,
  ResourceAccessPoint
} from "../flux/resourceStores/resource.type";
import type {
  IContextMenu,
  IContextMenuItem
} from "$lib/client/types/select.type";
import { ResourceActions } from "../record/resource.actions";
import { appStore } from "$lib/client/stores/app.store";
import { Action } from "$lib/client/types/action.enum";
import { getUtcSafeDay } from "$lib/client/elements/datetime/datetime.utils";
import { Product } from "$lib/client/products/product.type";
import { get } from "svelte/store";
import view from "$lib/client/stores/view.store";
import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";
import { resolveResourceIcon } from "../flux/resourceStores/resource.utils";
import { activeSession } from "$lib/client/products/pointron/focus/session.store";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { goalStore } from "../goals/goal.store";
import type { IGoalThumb } from "../goals/goal.type";

const defaults = {
  dateUnix: 0,
  goalId: "",
  isChecked: false
};
class TaskStore extends ResourceStore<ITask, ITaskCapture> {
  constructor() {
    super(Resource.task, {
      indices: ["dateUnix", "goalId"],
      searchIndices: ["label"],
      expandProps: ["goalId"],
      defaultProps: defaults
    });
  }

  async selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    if (!additionalParams?.isExpand)
      return super.selectMany(params, additionalParams);
    const result = await super.selectMany(params, additionalParams);
    if (!isValidArrayWithData(result)) return result;
    const goalIds = result.map((x: ITaskThumb) => x.goalId);
    if (!isValidArrayWithData(goalIds)) return result;
    const goals = await goalStore.selectMany(
      {
        filters: {
          id: goalIds
        }
      },
      {
        isExpand: true
      }
    );
    result.map((x: ITaskThumb) => {
      if (x.goalId) {
        x.goal = goals?.find((g: IGoalThumb) => g.id === x.goalId);
      }
    });
    return result;
  }

  async save(
    form: {
      label?: string;
      dateUnix?: number;
      goalId?: IRecordId;
      collectionId?: IRecordId;
    },
    params?: { id?: IRecordId; context?: string }
  ) {
    logger.log({ at: "TaskStore.save", form });
    const resource: ITaskCapture = {
      id: params?.id ?? generateResourceId(Resource.task),
      label: form.label ?? "",
      dateUnix: form.dateUnix
        ? resolveUnixTimestamp(getUtcSafeDay(new Date(form.dateUnix)))
        : defaults.dateUnix,
      ...(form.goalId && { goalId: form.goalId })
    };
    appStore.addToRecents({
      record: resource,
      type: Resource.task,
      timestamp: new Date()
    });
    return super.create([resource], {
      context: params?.context
    });
  }

  async toggle(id: IRecordId, params?: { context?: string }) {
    const task = await super.select(id);
    if (!task) return;
    const newVal = !task.isChecked;
    return super.modify(
      id,
      {
        isChecked: newVal,
        completedAtUnix: newVal ? resolveUnixTimestamp() : undefined
      },
      {
        context: params?.context
      }
    );
  }
}

export const taskStore = new TaskStore();

class TaskActions {
  constructor(
    private task: ITask,
    private store: TaskStore,
    private accessPoint: ResourceAccessPoint
  ) {}

  focusNow = {
    value: "focusNow",
    label: "Focus now",
    icon: "circle",
    callback: async () => {
      await activeSession.focusTask(this.task.id, this.task.goalId);
    }
  };

  toggle() {
    return {
      value: "toggle",
      label: this.task.isChecked ? "Mark as incomplete" : "Mark as complete",
      icon: this.task.isChecked ? "square" : "check-square",
      callback: async () => {
        await this.store.toggle(this.task.id, {
          context: this.accessPoint
        });
      }
    };
  }

  editGoal() {
    return {
      value: "editGoal",
      icon: resolveResourceIcon(Resource.goal),
      label:
        this.accessPoint === ResourceAccessPoint.GOAL
          ? "Move to another goal"
          : this.task.goalId
            ? "Change goal"
            : "Assign goal",
      callback: async () => {
        appStore.runAction(Action.EDIT_TASK_GOAL, {
          componentParams: {
            taskId: this.task.id,
            context: this.accessPoint
          }
        });
      }
    };
  }

  openTask() {
    return {
      value: "openTask",
      icon: "pop",
      label: "Open task",
      callback: async () => {
        appStore.openResource(this.task.id, ResourceAccessMode.POP);
      }
    };
  }

  editDate = {
    value: "editDate",
    icon: "calendar",
    label: "Edit due date"
  };
}

export function resolveTaskContextMenu(
  task: ITask,
  accessPoint: ResourceAccessPoint,
  params?: {
    accessPointId?: IRecordId;
  }
): IContextMenu {
  const resourceActions = new ResourceActions(task, taskStore, accessPoint);
  const taskActions = new TaskActions(task, taskStore, accessPoint);
  const product = get(appStore).product;
  const viewStore = get(view);
  const isCurrentlyFocusing = activeSession.isCurrentFocusItem(task.id);
  let primaryItems: IContextMenuItem[] = [
    ...(accessPoint !== ResourceAccessPoint.SELF
      ? [taskActions.openTask()]
      : []),
    resourceActions.select(accessPoint, params?.accessPointId),
    ...(product === Product.POINTRON || product === Product.NUCLEUS
      ? [taskActions.editGoal()]
      : []),
    ...(viewStore.isConstrainedWidth ? [taskActions.editDate] : []),
    taskActions.toggle(),
    ...(isCurrentlyFocusing ? [] : [taskActions.focusNow])
  ];
  return [
    {
      group: "primary",
      items: [...primaryItems]
    },
    {
      group: "more",
      items: [resourceActions.trash()]
    }
  ];
}
