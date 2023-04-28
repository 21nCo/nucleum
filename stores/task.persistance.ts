import { Cloud } from "$lib/tidy/types/cloud.enum";
import { ItemType } from "$lib/tidy/types/item.enum";
import type { Task } from "$lib/tidy/types/session.type";
import { get } from "svelte/store";
import { Persistance, persistLocally, retrieveLocally } from "./persistance";
import { cloudProvider } from './stores'


const persistance = new Persistance();
export class TaskPersistance {
    updateTasks(tasks: Task[]) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let savedTasks = retrieveLocally(ItemType.Task);
                if (!savedTasks || savedTasks.length < 1) return;
                tasks.forEach((task: Task) => {
                    if (savedTasks?.some((t: Task) => t.id === task.id)) {
                        persistance.update(task, ItemType.Task);
                    }
                })
                break;
        }
    }
    updateSessionId(tasks: Task[], sessionId: string) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let savedTasks = retrieveLocally(ItemType.Task);
                savedTasks.forEach((task: Task) => {
                    if (tasks.some((x: Task) => x.id === task.id)) {
                        task.sessionId = sessionId;
                        persistance.update(task, ItemType.Task);
                    }
                });
                break;
        }
    }
    createTasks(tasks: Task[]) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let savedTasks = retrieveLocally(ItemType.Task);
                let newTasks: Task[] = [];
                tasks.forEach((task: Task) => {
                    if (savedTasks?.some((t: Task) => t.id === task.id)) {
                        savedTasks = savedTasks.filter((t: Task) => t.id != task.id)
                    }
                    newTasks.push(task);
                })
                let allTasks = [...savedTasks ?? [], ...newTasks];
                persistLocally(ItemType.Task, allTasks);
                break;
        }
    }
    retrieveTasks(sessionId: string) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let savedTasks = retrieveLocally(ItemType.Task);
                let filtered = savedTasks?.filter((task: Task) => task.sessionId === sessionId);
                return filtered;
            default:
                return [];
        }

    }
}


