import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { type IRecordId } from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import type { ITask } from "./task.type";
import type {
  OmitForCapture,
  OmitForCaptureWithId
} from "../flux/resourceStores/resource.type";

class TaskStore extends ResourceStore<ITask> {
  constructor() {
    super(Resource.task);
  }

  async save(form: OmitForCapture<ITask>, id?: IRecordId) {
    logger.log({ at: "TaskStore.save", form });
    const resource: OmitForCaptureWithId<ITask> = {
      id: id ?? generateResourceId(Resource.task),
      label: form.label,
      isChecked: form.isChecked ?? false,
      estimated: form.estimated,
      date: form.date,
      goal: form.goal
    };

    return super.create([resource]);
  }

  async toggle(id: IRecordId) {
    const task = await super.select(id);
    if (!task) return;

    return super.modify(id, {
      isChecked: !task.isChecked,
      completed: task.isChecked ? new Date() : undefined
    });
  }
}

export const taskStore = new TaskStore();
