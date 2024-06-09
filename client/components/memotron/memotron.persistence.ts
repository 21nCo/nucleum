import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";

export class MemotronPersistence {
  surrealDb = new SurrealDatabase();
}
