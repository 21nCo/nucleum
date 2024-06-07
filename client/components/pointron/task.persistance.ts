import { Cloud } from "$lib/client/types/cloud.enum";
import { Item } from "$lib/client/types/item.enum";
import type { FocusTask } from "$lib/client/types/pointron/session.type";
import { get } from "svelte/store";
import {
  Persistance,
  persistLocally,
  retrieveLocally
} from "$lib/client/stores/persistance";
import { cloudProvider } from "$lib/client/stores/app.store";

export class TaskPersistance {
  persistance = new Persistance();
  updateTasks(tasks: FocusTask[]) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let savedTasks = retrieveLocally(Item.PointTask);
        if (!savedTasks || savedTasks.length < 1) return;
        tasks.forEach((task: FocusTask) => {
          if (savedTasks?.some((t: FocusTask) => t.id === task.id)) {
            this.persistance.update(task, Item.PointTask);
          }
        });
        break;
    }
  }
  updateSessionId(tasks: FocusTask[], sessionId: string) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let savedTasks = retrieveLocally(Item.PointTask);
        savedTasks.forEach((task: FocusTask) => {
          if (tasks.some((x: FocusTask) => x.id === task.id)) {
            task.sessionId = sessionId;
            this.persistance.update(task, Item.PointTask);
          }
        });
        break;
    }
  }
  createTasks(tasks: FocusTask[]) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let savedTasks = retrieveLocally(Item.PointTask);
        let newTasks: FocusTask[] = [];
        tasks.forEach((task: FocusTask) => {
          if (savedTasks?.some((t: FocusTask) => t.id === task.id)) {
            savedTasks = savedTasks.filter((t: FocusTask) => t.id != task.id);
          }
          newTasks.push(task);
        });
        let allTasks = [...(savedTasks ?? []), ...newTasks];
        persistLocally(Item.PointTask, allTasks);
        break;
    }
  }
  retrieveTasks(sessionId: string) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let savedTasks = retrieveLocally(Item.PointTask);
        let filtered = savedTasks?.filter(
          (task: FocusTask) => task.sessionId === sessionId
        );
        return filtered;
      default:
        return [];
    }
  }
}
