import { SurrealDatabase } from "$lib/client/access/surrealHelper";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import type { ICurationCreationForm } from "../types/memotron/curation.type";

const surrealDb = new SurrealDatabase();
export class CurationPersistance {
  /**
   * ! Deprecated
   * dataManager delegation - performMutation, performMutationForIFR is being used
   * @param curation
   * @returns
   */
  async create(curation: ICurationCreationForm) {
    let response = await surrealDb.query(
      "return fn::memotron::curation::create($curation);",
      {
        curation
      }
    );
    return interceptSurrealResponse(response, "create curation");
  }

  async fetch(id: string) {
    const query = `fn::memotron::curation::fetch($id)`;
    const response = await surrealDb.query(query, { id });
    return interceptSurrealResponse(response, "fetch curation");
  }
}
