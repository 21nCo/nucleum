// The account service's generated FileFn schema, copied in by the Dockerfile.
import * as schema from './filefn-schema.mjs';
import { openFileFnDatabase } from './postgres.mjs';

/**
 * `FILEFN_DATABASE` module of the processing container: the FileFn tables in
 * the region's account Postgres (`FILEFN_DATABASE_URL`), through the same
 * generated Drizzle schema the account service uses. `close()` ends the pool.
 */
export default function createDatabase(env) {
  return openFileFnDatabase(env, schema);
}
