import { Cloud } from "$lib/tidy/types/cloud.enum";
import { ObjectType } from "$lib/tidy/types/object.enum";
import type { Session, UserDate } from "$lib/tidy/types/session.type";
import { checkDay, checkIsToday, checkIsTodayUsingTimestamp, getCurrentUserDate, getUserDate } from "$lib/utils";
import { get } from "svelte/store";
import { persistLocally, retrieveLocally } from "./persistance";
import { cloudProvider, userPreferences } from './stores'



export class SessionPersistance {
    getProgress() {
        let focus = 0;
        let streak = 0;

        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions: Session[] = retrieveLocally(ObjectType.Sessions);
                if (!sessions || !sessions.length) break;
                sessions = sessions.map(session => transformSession(session));
                if (!sessions) break;
                let today = new Date();
                let todaySessions = sessions.filter((s: Session) => {
                    return checkIsTodayUsingTimestamp(s.start, get(userPreferences).dayStart)
                });
                if (todaySessions.length > 0) {
                    focus = todaySessions
                        ?.map((x: { focus: any; }) => x.focus)
                        .reduce((agg: any, x: any) => agg + x);
                }
                if (get(userPreferences).isEnableDailyTarget) {
                    //todo - calculate streak
                    streak = 0;
                }

        }
        return { focus, streak };
    }
    createSession(session: Session) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions = retrieveLocally(ObjectType.Sessions);
                if (!sessions) {
                    sessions = [];
                }
                sessions.push(session);
                persistLocally(ObjectType.Sessions, sessions);
                break;
        }
    }
    deleteSession(sessionId: any) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions = retrieveLocally(ObjectType.Sessions);
                sessions = sessions.filter((s: { id: any; }) => s.id !== sessionId);
                persistLocally(ObjectType.Sessions, sessions);
                break;
        }
    }
    resetSnapshot() {
        switch (get(cloudProvider)) {
            case Cloud.local:
                persistLocally(ObjectType.Snapshot, "");
                break;
        }
    }
    saveSnapshot(snapshot: any) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                persistLocally(ObjectType.Snapshot, snapshot);
                break;
        }
    }
    retrieveSessions(userDate: UserDate) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions: Session[] = retrieveLocally(ObjectType.Sessions);
                if (!sessions || !sessions.length) break;
                sessions = sessions.map(session => transformSession(session));
                if (!sessions) return;
                return sessions.filter((s: Session) => {
                    return checkDay(userDate, s.start, get(userPreferences).dayStart)
                });
            default:
                return [];
        }

    }
    retrieveFirstDay(dayStart: string) {
        let firstDay = getCurrentUserDate(dayStart);
        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions: Session[] = retrieveLocally(ObjectType.Sessions);
                if (!sessions || !sessions.length) break;
                sessions = sessions.map(session => transformSession(session));
                if (!sessions) return;
                firstDay = getUserDate(sessions[0].start);
                break;
        }
        return firstDay;
    }
}


function transformSession(session: Session) {
    return {
        ...session,
        startTime: new Date(session.start),
        endTime: new Date(session.end)
    };
}