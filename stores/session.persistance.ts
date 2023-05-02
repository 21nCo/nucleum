import { Cloud } from "$lib/tidy/types/cloud.enum";
import { ItemType } from "$lib/tidy/types/item.enum";
import type { Session, UserDate } from "$lib/tidy/types/session.type";
import { aggregateFocusFromSessions, checkDay, checkIsToday, checkIsTodayUsingTimestamp, getCurrentUserDate, getOneDayEarlier, getUserDate } from "$lib/tidy/utils";
import { get } from "svelte/store";
import { persistLocally, retrieveLocally } from "./persistance";
import { cloudProvider } from '../../pointron/stores/session.store'
import { userPreferences } from "./app.store";
import { userLocalPreferences } from "$lib/pointron/stores/pointron.store";



export class SessionPersistance {
    getProgress() {
        let focus = 0;
        let streak = 1;
        const userDayStartTime = get(userPreferences).dayStart;
        const userFocusTarget = get(userLocalPreferences).dailyFocusTarget ?? 0;
        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions: Session[] = retrieveLocally(ItemType.Sessions);
                if (!sessions || !sessions.length) break;
                sessions = sessions.map(session => transformSession(session));
                if (!sessions) break;
                let todaySessions = sessions.filter((s: Session) => {
                    return checkIsTodayUsingTimestamp(s.start, userDayStartTime)
                });
                if (todaySessions.length > 0) {
                    focus = todaySessions
                        ?.map((x: { focus: any; }) => x.focus)
                        .reduce((agg: any, x: any) => agg + x);
                }
                if (get(userLocalPreferences).isEnableDailyTarget) {
                    let current = getCurrentUserDate(userDayStartTime);
                    let isEnd = false;
                    while (isEnd) {
                        let previous = getOneDayEarlier(current);
                        let sessions = new SessionPersistance().retrieveSessions(previous);
                        let focus = aggregateFocusFromSessions(sessions ?? []);
                        if (focus && focus > userFocusTarget) {
                            current = previous;
                            streak++;
                        }
                        else {
                            isEnd = true;
                        }
                    }
                }
        }
        return { focus, streak };
    }
    resetSnapshot() {
        switch (get(cloudProvider)) {
            case Cloud.local:
                persistLocally(ItemType.Snapshot, "");
                break;
        }
    }
    saveSnapshot(snapshot: any) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                persistLocally(ItemType.Snapshot, snapshot);
                break;
        }
    }
    retrieveSessions(userDate: UserDate) {
        switch (get(cloudProvider)) {
            case Cloud.local:
                let sessions: Session[] = retrieveLocally(ItemType.Sessions);
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
                let sessions: Session[] = retrieveLocally(ItemType.Sessions);
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