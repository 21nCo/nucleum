import { Cloud } from "$lib/tidy/types/cloud.enum";
import { ObjectType } from "$lib/tidy/types/object.enum";
import type { Session, Task } from "$lib/tidy/types/session.type";
import { checkDay } from "$lib/tidy/utils";
import { get } from "svelte/store";
import { persistLocally, retrieveLocally } from "./persistance";
import { cloudProvider, userPreferences } from './stores'



export class TaskPersistance {
    updateTasks(sessionId: number, tasks: Task[]) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions = retrieveLocally(ObjectType.Sessions);
                let sessionIndex = sessions.findIndex((session: { id: number; }) => session.id === sessionId);
                if (sessions && sessionIndex >= 0) {
                    sessions[sessionIndex].tasks = tasks;
                    persistLocally(ObjectType.Sessions, sessions);
                }
                break;
        }
    }
    retrieveTasks(sessionId: number) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions = retrieveLocally(ObjectType.Sessions);
                if (!sessions) return;
                let sessionIndex = sessions.findIndex((session: { id: number; }) => session.id === sessionId);
                return sessions[sessionIndex].tasks;
            default:
                return [];
        }

    }
}


