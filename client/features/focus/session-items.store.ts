import { Resource } from "@nucleum/datafn/resource.enum";
import {
  type IFocusItemsStore,
  type IFocusItem
} from "@nucleum/features/focus/session.type";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { appEvents } from "@nucleum/shared-state/events/app-events.store";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { PointronEvent } from "@nucleum/shared-state/events/focus-event.enum";
import { datafn } from "@nucleum/datafn/datafn.store";
import { ObservableStore } from "@nucleum/datafn/observable-store";
import { isSameResource, resourceInList } from "@nucleum/datafn/resource.utils";
import {
  ObjectiveStatus,
  type IObjective
} from "@nucleum/features/focus/goals/goal.type";
import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";
import { getUtcSafeDay } from "@21n/ui/elements/datetime/datetime.utils";
import type { ITaskCapture } from "@nucleum/features/focus/tasks/task.type";
import { StoreDataType } from "@nucleum/schema/legacy/store-data-type.enum";

const seedFocusItemsStore: IFocusItemsStore = {
  items: [],
  removedItems: []
};

/** Owns persisted active and removed focus items independently of the timer. */
export class FocusItemsStore extends ObservableStore<IFocusItemsStore> {
  isInitialized = false;
  private signal = datafn.kv.signal<IFocusItemsStore>(
    Resource.sessionFocusItems,
    { defaultValue: { ...seedFocusItemsStore } }
  );

  constructor(private readonly onObjectiveSelected: (id: IRecordId) => void) {
    super(Resource.sessionFocusItems, StoreDataType.KVO);
    this._set({ ...seedFocusItemsStore });
    this.signal.subscribe((value) => {
      this.loader(value);
    });
  }

  loader(data: IFocusItemsStore) {
    if (!data.items) data.items = [];
    if (!data.removedItems) data.removedItems = [];
    this.isInitialized = true;
    this._set({ ...data });
  }

  async modify(
    n: Partial<IFocusItemsStore>,
    params: {
      isPersist?: boolean;
      isDebouncedPersist?: boolean;
      isPreventCachingDefault?: boolean;
    } = {
      isPersist: true
    }
  ) {
    const current = this.get();
    const next = { ...current, ...n };
    this._set(next);
    if (params.isPreventCachingDefault) return;
    if (params.isDebouncedPersist) {
      return datafn.kv.merge(Resource.sessionFocusItems, n, {
        debounceMs: 3000
      });
    }
    if (params.isPersist) {
      return datafn.kv.merge(
        Resource.sessionFocusItems,
        n as Record<string, unknown>
      );
    }
  }

  reset(isPersist: boolean = false) {
    logger.log({ context: "focus items store - reset" });
    this.modify(
      { items: [], removedItems: [] },
      {
        isPersist
      }
    );
  }

  async refreshRecents(items: { id: IRecordId; startUnix: number }[]) {
    const objectivesResult = await datafn.objective.query({
      select: ["*", "children.*", "tasks.*"],
      filters: {
        id: { $in: items.map((x) => x.id.toString()) },
        status: {
          $ne: ObjectiveStatus.COMPLETED
        }
      }
    });
    const newRecents = items
      .map((x) => {
        const objective = (
          objectivesResult.data as IObjective[] | undefined
        )?.find(resourceInList(x.id));
        if (!objective) return;
        return {
          id: x.id,
          item: objective,
          startUnix: x.startUnix
        };
      })
      .filter(
        (recent): recent is { id: string; item: any; startUnix: number } =>
          Boolean(recent && recent.id && recent.item)
      );
    this.modify({ recents: newRecents });
  }

  async addNewTask(label: string, objectiveId?: IRecordId) {
    let id = generateResourceId(Resource.task);
    await this.addTask(id, objectiveId);
    const task: ITaskCapture = {
      id,
      label,
      isChecked: false,
      dateUnix: resolveUnixTimestamp(getUtcSafeDay(new Date())),
      ...(objectiveId && { objectiveId })
    };
    appStore.addToRecents({
      record: task,
      type: Resource.task,
      timestamp: new Date()
    });
    await datafn.task.mutate({
      operation: "insert",
      id: id.toString(),
      record: task
    });
    return [task];
  }

  async addTask(id: IRecordId, objectiveId?: IRecordId) {
    let n = this.get();
    if (n.items.some(resourceInList(id)))
      throw new Error("Task already exists");
    let blocks:
      | {
          start: number;
          end: number;
        }[]
      | undefined = undefined;
    const removedTask = n.removedItems?.find(resourceInList(id));
    if (removedTask) {
      n.removedItems =
        n.removedItems?.filter((item) => !isSameResource(item, id)) ?? [];
      blocks = removedTask.blocks ?? [];
    }

    if (objectiveId && !n.items.some(resourceInList(objectiveId))) {
      const removedObjective = n.removedItems?.find(
        resourceInList(objectiveId)
      );
      if (removedObjective) {
        n.removedItems =
          n.removedItems?.filter(
            (item) => !isSameResource(item, objectiveId)
          ) ?? [];
        n.items.push({ ...removedObjective, tasks: [] });
      } else {
        n.items.push({ id: objectiveId, tasks: [], blocks: [] });
      }
    }

    this.modify({
      items: [
        ...(n.items.map((x: IFocusItem) => {
          if (objectiveId && isSameResource(x.id, objectiveId))
            x.tasks = [...(x.tasks ?? []), id];
          return x;
        }) ?? []),
        {
          id,
          tasks: [],
          blocks: [...(blocks ?? [])]
        }
      ]
    });
    if (objectiveId) this.onObjectiveSelected(objectiveId);
  }

  async addObjective(id: IRecordId) {
    let n = this.get();
    if (n.items.some(resourceInList(id))) return;

    const removedObjective = n.removedItems?.find(resourceInList(id));
    if (removedObjective) {
      n.removedItems =
        n.removedItems?.filter((item) => !isSameResource(item, id)) ?? [];
      n.items.push(removedObjective);
    } else {
      n.items.push({ id, tasks: [], blocks: [] });
    }
    this.modify(n);
    this.onObjectiveSelected(id);
  }
  async resetToPresetObjectives(ids: IRecordId[]) {
    let n = this.get();
    n.items = ids.map((id) => ({ id, tasks: [], blocks: [] }));
    this.modify(n);
    this.onObjectiveSelected(ids[0]);
    appEvents.publish(PointronEvent.REFRESH_FOCUSITEMS);
  }

  async appendFocusBlock(id: IRecordId, block: { start: number; end: number }) {
    let n = this.get();
    const items = n.items.map((item) => {
      if (isSameResource(item.id, id)) {
        item.blocks = [...(item.blocks ?? []), block];
        return item;
      }
      return item;
    });
    return this.modify({ items });
  }

  async removeFocusItem(id: IRecordId) {
    let n = this.get();
    if (!n || n.items.length === 0) return;
    const removedItem = n.items.find((item) => isSameResource(item.id, id));
    if (!removedItem) return;
    const parentObjectiveId = n.items.find((item) =>
      item.tasks?.some(resourceInList(id))
    )?.id;

    if (!n.removedItems) n.removedItems = [];
    const itemsToRemove = n.items
      .filter(
        (item) =>
          isSameResource(item.id, id) ||
          removedItem.tasks?.some(resourceInList(item.id))
      )
      .map((item) =>
        isSameResource(item.id, id) && parentObjectiveId
          ? { ...item, parentObjectiveId }
          : item
      );
    n.removedItems.push(...itemsToRemove);

    n.items = n.items.filter(
      (item) =>
        !isSameResource(item.id, id) &&
        !removedItem.tasks?.some(resourceInList(item.id))
    );

    n.items = n.items.map((item) => {
      if (item.tasks && item.tasks?.length > 0) {
        item.tasks = item.tasks.filter((t) => !isSameResource(t, id));
      }
      return item;
    });

    this.modify(n);
  }

  async propagateDependencyChanges(data: any) {
    logger.log({
      context: "propagateDependencyChanges to focusItemsStore",
      data
    });
  }

  resolveCount(items: IFocusItem[]) {
    return items.length;
  }

  async rearrangeFocusItems(fromId: IRecordId, toId: IRecordId) {
    let n = this.get();
    if (
      !fromId ||
      !toId ||
      !n.items.some(resourceInList(fromId)) ||
      !n.items.some(resourceInList(toId))
    ) {
      return;
    }
    const items = [...n.items];
    const fromIndex = items.findIndex((item) =>
      isSameResource(item.id, fromId)
    );
    const toIndex = items.findIndex((item) => isSameResource(item.id, toId));
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);
    this.modify({ items });
  }

  async rearrangeTasksInObjective(
    objectiveId: IRecordId,
    fromId: IRecordId,
    toId: IRecordId
  ) {
    let n = this.get();
    const objectiveItem = n.items.find(resourceInList(objectiveId));
    if (
      !objectiveItem ||
      !objectiveItem.tasks ||
      objectiveItem.tasks.length === 0
    ) {
      return;
    }
    const fromIndex = objectiveItem.tasks.findIndex(resourceInList(fromId));
    const toIndex = objectiveItem.tasks.findIndex(resourceInList(toId));
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= objectiveItem.tasks.length ||
      toIndex >= objectiveItem.tasks.length
    ) {
      return;
    }
    const tasks = [...objectiveItem.tasks];
    const [movedTask] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, movedTask);

    const items = n.items.map((item) => {
      if (isSameResource(item.id, objectiveId)) {
        return { ...item, tasks };
      }
      return item;
    });
    this.modify({ items });
  }
}
