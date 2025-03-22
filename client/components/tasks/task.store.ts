import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import {
  type IRecordId,
  type IResourceSelectParams
} from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import type { ITask } from "./task.type";
import {
  ResourceAccessPoint,
  type OmitForCapture,
  type OmitForCaptureWithId
} from "../flux/resourceStores/resource.type";
import type {
  IContextMenu,
  IContextMenuItem
} from "$lib/client/types/select.type";
import { ResourceActions } from "../record/resource.actions";
import { appStore } from "$lib/client/stores/app.store";
import { Action } from "$lib/client/types/action.enum";
import { getUtcSafeDay } from "$lib/client/elements/datetime/datetime.utils";
import { Product } from "$lib/client/types/product.type";
import { get } from "svelte/store";
class TaskStore extends ResourceStore<ITask> {
  constructor() {
    super(Resource.task);
  }

  selectMany(params?: IResourceSelectParams, additionalParams?: any) {
    const properties = ["*", "goalId.* as goal", ...(params?.properties ?? [])];
    params = {
      ...(params ?? {}),
      properties
    };
    return super.selectMany(params, additionalParams);
  }

  async save(
    form: OmitForCapture<ITask>,
    params?: { id?: IRecordId; context?: string }
  ) {
    logger.log({ at: "TaskStore.save", form });
    const resource: OmitForCaptureWithId<ITask> = {
      id: params?.id ?? generateResourceId(Resource.task),
      label: form.label,
      isChecked: form.isChecked ?? false,
      estimated: form.estimated,
      date: form.date ? getUtcSafeDay(form.date) : undefined,
      goalId: form.goalId
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
        completedAt: newVal ? new Date() : undefined
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

  toggle() {
    return {
      value: "toggle",
      label: this.task.isChecked ? "Mark as incomplete" : "Mark as complete",
      icon: this.task.isChecked ? "ph:square-light" : "ph:check-square-light",
      callback: async () => {
        await this.store.toggle(this.task.id, {
          context: this.accessPoint
        });
      }
    };
  }

  editGoal = {
    value: "editGoal",
    icon: "ph:circle-light",
    label: "Edit goal",
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

export function resolveTaskContextMenu(
  goal: ITask,
  accessPoint: ResourceAccessPoint,
  params?: {
    accessPointId?: IRecordId;
  }
): IContextMenu {
  const resourceActions = new ResourceActions(goal, taskStore, accessPoint);
  const taskActions = new TaskActions(goal, taskStore, accessPoint);
  const product = get(appStore).product;
  let primaryItems: IContextMenuItem[] = [];

  if (accessPoint === ResourceAccessPoint.COLLECTION && params?.accessPointId) {
    primaryItems = [
      resourceActions.unlink(params?.accessPointId),
      resourceActions.select(accessPoint, params?.accessPointId),
      taskActions.toggle()
    ];
  } else if (
    accessPoint === ResourceAccessPoint.GOAL &&
    params?.accessPointId
  ) {
    primaryItems = [
      resourceActions.select(accessPoint, params?.accessPointId),
      taskActions.toggle()
      // resourceActions.addToCollection()
    ];
  } else if (product === Product.POINTRON || product === Product.NUCLEUS) {
    primaryItems = [
      resourceActions.select(accessPoint, params?.accessPointId),
      taskActions.editGoal,
      taskActions.toggle()
      // resourceActions.addToCollection()
    ];
  } else {
    primaryItems = [
      resourceActions.select(accessPoint, params?.accessPointId),
      taskActions.toggle()
    ];
  }
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
