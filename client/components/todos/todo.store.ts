import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { type IRecordId } from "$lib/client/types/data.type";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import type { ITodo } from "./todo.type";
import type {
  OmitForCapture,
  OmitForCaptureWithId
} from "../flux/resourceStores/resource.type";

class TodoStore extends ResourceStore<ITodo> {
  constructor() {
    super(Resource.todo);
  }

  async save(form: OmitForCapture<ITodo>, id?: IRecordId) {
    logger.log({ at: "TodoStore.save", form });
    const resource: OmitForCaptureWithId<ITodo> = {
      id: id ?? generateResourceId(Resource.todo),
      label: form.label,
      isChecked: form.isChecked ?? false,
      estimated: form.estimated,
      date: form.date,
      taskId: form.taskId
    };

    return super.create([resource]);
  }

  async toggle(id: IRecordId) {
    const todo = await super.select(id);
    if (!todo) return;

    return super.modify(id, {
      isChecked: !todo.isChecked
    });
  }
}

export const todoStore = new TodoStore();
