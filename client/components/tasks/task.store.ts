import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "@21n/components/flux/resourceStores/resource.store";
import {
  type IRecordId,
  type IResourceSelectAdditionalParams,
  type IResourceSelectParams
} from "@21n/types/data.type";
import { generateResourceId } from "@21n/components/flux/flux.utils";
import { logger } from "@21n/components/debug/logger.client";
import type { ITask, ITaskCapture, ITaskThumb } from "@21n/components/tasks/task.type";
import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
import type {
  IContextMenu,
  IContextMenuItem
} from "@21n/types/select.type";
import { ResourceActions } from "@21n/components/record/resource.actions";
import { appStore } from "@21n/stores/app.store";
import { Action } from "@21n/types/action.enum";
import { getUtcSafeDay } from "@21n/elements/datetime/datetime.utils";
import { Product } from "@21n/products/product.type";
import { get } from "svelte/store";
import view from "@21n/stores/view.store";
import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";
import { resolveResourceIcon } from "@21n/components/flux/resourceStores/resource.utils";
import { activeSession } from "@21n/products/pointron/focus/session.store";
import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
import { goalStore } from "@21n/components/goals/goal.store";
import type { IGoalThumb } from "@21n/components/goals/goal.type";

const defaults = {
  dateUnix: 0,
  goalId: "",
  isChecked: false
};
class TaskStore extends ResourceStore<ITask, ITaskCapture> {
  constructor() {
    super(Resource.task, {
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
    const goalIds = Array.from(
      new Set((result as ITaskThumb[]).map((x) => x.goalId).filter(Boolean))
    ) as IRecordId[];
    if (goalIds.length === 0) return result;
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
    const goalMap = new Map<IRecordId, IGoalThumb>(
      (goals ?? []).map((g: IGoalThumb) => [g.id, g])
    );
    (result as ITaskThumb[]).forEach((x) => {
      if (x.goalId) x.goal = goalMap.get(x.goalId);
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

export const taskStore = TaskStore.resolve(Resource.task);

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
      label: "Open task"
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
