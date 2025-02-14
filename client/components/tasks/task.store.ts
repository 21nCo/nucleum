import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { StoreDataType, type IRecordId } from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { recentsStore } from "../record/recent.store";
import type { IActiveTask, ITask } from "./task.type";
import { TaskType } from "./task.type";
import {
  ResourceAccessMode,
  ResourceAccessPoint
} from "../flux/resourceStores/resource.type";
import type {
  OmitForCapture,
  OmitForCaptureWithId
} from "../flux/resourceStores/resource.type";
import { ResourceActions } from "../record/resource.actions";
import type { IContextMenu } from "$lib/client/types/select.type";
import { CollectibleStore } from "../collection/collectible.store";

class TaskStore extends ResourceStore<ITask> {
  constructor() {
    super(Resource.task);
  }

  async save(
    form: OmitForCapture<ITask>,
    additionalParams?: {
      subTasks?: string[];
      context?: string;
    }
  ) {
    const id = generateResourceId(Resource.task);
    logger.log({ at: "TaskStore.save", form });

    let subTaskIds: IRecordId[] = [];
    let subTasks: OmitForCaptureWithId<ITask>[] = [];
    if (additionalParams?.subTasks && additionalParams.subTasks.length > 0) {
      subTasks = additionalParams.subTasks.map((subTask) => ({
        id: generateResourceId(Resource.task),
        label: subTask,
        type: TaskType.INDEFINITE,
        parent: [id],
        isCompleted: false,
        accessMode: ResourceAccessMode.POP
      }));
      subTaskIds = subTasks.map((subTask) => subTask.id);
    }

    const resource: OmitForCaptureWithId<ITask> = {
      id,
      label: form.label || "",
      type: form.type || TaskType.INDEFINITE,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      parent: form.parent,
      color: form.color,
      subTasks: subTaskIds,
      subTasksMethod: form.subTasksMethod
    };

    recentsStore.add(resource, {
      type: Resource.task,
      timestamp: new Date()
    });

    return super.create([resource, ...subTasks], additionalParams);
  }

  async addSubTaskWithContext(
    src: IRecordId[],
    subTask: {
      label: string;
      type?: TaskType;
    },
    currentSubTasks?: IRecordId[]
  ) {
    const task = {
      id: generateResourceId(Resource.task),
      label: subTask.label,
      type: subTask.type ?? TaskType.INDEFINITE,
      parent: [...src]
    };
    await super.modify(
      src[src.length - 1],
      {
        subTasks: [...(currentSubTasks || []), task.id]
      },
      {
        isPreventBackPropagation: true
      }
    );
    return super.create([task]);
  }

  async addSubTask(
    src: IRecordId,
    subTask: {
      label: string;
      type?: TaskType;
    }
  ) {
    const taskData = await super.select(src);
    if (!taskData) return;
    this.addSubTaskWithContext(
      [...(taskData.parent || []), src],
      subTask,
      taskData.subTasks
    );
  }
}

export const taskStore = new TaskStore();

export class ActiveTaskStore extends CollectibleStore<IActiveTask, TaskStore> {
  constructor(taskId: IRecordId) {
    super(taskId, taskStore);
  }

  async init(accessMode: ResourceAccessMode) {
    logger.log({ at: "ActiveTaskStore.init", id: this.id });
    try {
      const result = await this.resourceStore.select(this.id, [
        "*",
        "(select * from $parent.subTasks) as subTasks",
        "(select * from $parent.parent) as parent"
      ]);
      logger.debug({ at: "ActiveTaskStore.init - select", result });

      if (!result) {
        this.set({
          id: this.id,
          label: "",
          type: TaskType.INDEFINITE,
          modifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          accessMode,
          isPageLoading: false
        });
        return;
      }

      this.set({
        ...result,
        isPageLoading: false,
        accessMode
      });

      recentsStore.add(result, {
        type: Resource.task,
        timestamp: new Date()
      });
    } catch (e) {
      console.error("error in init task store", {
        id: this.id,
        error: e
      });
    }
  }
}

export type IActiveTaskStore = InstanceType<typeof ActiveTaskStore>;

export function resolveTaskContextMenu(
  task: ITask,
  accessPoint: ResourceAccessPoint
): IContextMenu {
  const resourceActions = new ResourceActions(task, taskStore, accessPoint);
  return [
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}
