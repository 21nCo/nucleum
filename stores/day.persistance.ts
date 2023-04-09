import { Cloud } from $lib / tidy / typescloud.enum";
import { ObjectType } from $lib / tidy / typesobject.enum";
import type { Session, Task } from $lib / tidy / typessession.type";
import { checkDay } from "$lib/utils";
import { get } from "svelte/store";
import { persistLocally, retrieveLocally } from "./persistance";
import { cloudProvider, userPreferences } from './stores'



export class DayPersistance {
    retrieveDay(sessionId: number) {
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


