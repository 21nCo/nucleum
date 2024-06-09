import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { appStore, seedUserPreferences } from "$lib/client/stores/app.store";
import { seedLocalPreferences } from "./pointron.store";
import {
  focusItemsStore,
  sessionStore,
  todayFocusStore
} from "./focus/session.store";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import { logger } from "$lib/client/stores/log.store";

const surrealDb = new SurrealDatabase(import.meta.env.VITE_SURREAL_URL);
export class PointronPersistence {
  async syncSeedDataToCloud() {
    const kvalues: any[] = [
      seedLocalPreferences,
      seedUserPreferences,
      { id: "mutationMap" }
    ];
    await surrealDb.query(`insert into kv $kvalues`, { kvalues });
  }
  /**
   * @deprecated - dataManager is used to sync user data
   * @param isSyncFocusState
   * @returns
   */
  async syncUserData(isSyncFocusState: boolean) {
    let query = `return fn::pointron::load::v2(false);`;
    if (isSyncFocusState) query = `return fn::pointron::load::v2(true);`;
    const response = await surrealDb.executeReadFn(query);
    const value = interceptSurrealResponse(response, query);
    if (!value) return;
    // if (value.globalPreferences) {
    //   userPreferences.loader(value.globalPreferences);
    // }
    // if (value.localPreferences) {
    //   userLocalPreferences.loader(value.localPreferences);
    // }
    // if (value.tags) {
    // tagStore.set(value.tags);
    // tagStore.loader(value.tags);
    // }
    if (!isSyncFocusState) return;
    if (value.focus?.todayFocus) {
      todayFocusStore.set({
        focus: value.focus.todayFocus,
        streak: value.focus.streak
      });
    }
    if (value.focus?.session?.snapshot)
      sessionStore.loader(value.focus.session.snapshot);
    else sessionStore.loadEmptyState();
    if (value.focus?.session?.focusItems) {
      focusItemsStore.loader(value.focus.session.focusItems);
    }
  }
  async syncFocusState() {
    try {
      const query = `return fn::pointron::focus::sync::v2();`;
      const response = await surrealDb.executeReadFn(query);
      const value = interceptSurrealResponse(response, query);
      if (!value) return;
      if (value.todayFocus)
        todayFocusStore.set({ focus: value.todayFocus, streak: value.streak });
      if (value.session?.snapshot) sessionStore.loader(value.session.snapshot);
      else sessionStore.loadEmptyState();
      if (value.session?.focusItems) {
        focusItemsStore.loader(value.session.focusItems);
      }
    } catch (e) {
      logger.logError(e);
    }
  }
  async importData(data: any, fileName: string, fileSize: number) {
    const mainImport = await this.import(
      {
        goals: data.goals,
        tags: data.tags,
        kv: data.kv,
        tz: data.tz,
        targets: data.targets
      },
      fileName
    );
    if (!mainImport.importId) return mainImport;
    const importId = mainImport.importId;
    if (data.sessions.length > 1000) {
      for (let i = 0; i < data.sessions.length; i += 1000) {
        await this.importChunk(
          {
            sessions: data.sessions.slice(i, i + 1000),
            logs: []
          },
          importId
        );
      }
    } else {
      await this.importChunk({ sessions: data.sessions, logs: [] }, importId);
    }
    if (data.logs.length > 1000) {
      for (let i = 0; i < data.logs.length; i += 1000) {
        await this.importChunk(
          {
            sessions: [],
            logs: data.logs.slice(i, i + 1000)
          },
          importId
        );
      }
    } else {
      await this.importChunk({ sessions: [], logs: data.logs }, importId);
    }
    return mainImport;
  }
  async import(data: any, fileName: string) {
    const query = `fn::pointron::import($tags, $goals, $targets, $kv, $tz, $fileName)`;
    const response = await surrealDb.query(query, {
      ...data,
      fileName
    });
    return interceptSurrealResponse(response, query);
  }
  async importChunk(data: any, importId: string) {
    const query = `fn::pointron::importChunk($sessions, $logs, $importId)`;
    const response = await surrealDb.query(query, {
      ...data,
      importId
    });
    return interceptSurrealResponse(response, query);
  }
  async fetchImportHistory() {
    const query = `fn::pointron::importHistory();`;
    let response = await surrealDb.executeReadFn(query);
    return interceptSurrealResponse(response, query);
  }
  async revertImport(id: string) {
    const query = `fn::pointron::revertImport($id);`;
    let response = await surrealDb.query(query, {
      id: "import:" + id
    });
    return interceptSurrealResponse(response, query);
  }
  async exportData() {
    const query = `return fn::pointron::export();`;
    let response = await surrealDb.executeReadFn(query);
    return interceptSurrealResponse(response, query);
  }
}
