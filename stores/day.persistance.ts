import { get } from "svelte/store";
import { persistLocally, retrieveLocally } from "./persistance";
import { cloudProvider } from "$lib/local/stores/session.store";
import { Cloud } from "../types/cloud.enum";
import { ItemType } from "../types/item.enum";

export class DayPersistance {
  retrieveDay(sessionId: number) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let sessions = retrieveLocally(ItemType.Sessions);
        if (!sessions) return;
        let sessionIndex = sessions.findIndex(
          (session: { id: number }) => session.id === sessionId
        );
        return sessions[sessionIndex].tasks;
      default:
        return [];
    }
  }
}
