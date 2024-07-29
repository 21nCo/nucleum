import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { interceptSurrealResponse } from "$lib/client/utils/utils";

const surrealDb = new SurrealDatabase();
export class PointronPersistence {
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
    if (data.sessions.length > 400) {
      for (let i = 0; i < data.sessions.length; i += 400) {
        await this.importChunk(
          {
            sessions: data.sessions.slice(i, i + 400),
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
