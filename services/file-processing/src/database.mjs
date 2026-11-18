import * as schema from './filefn-schema.mjs';
import { openFileFnDatabase } from './postgres.mjs';

/**
 * `FILEFN_DATABASE` module of the processing container: the FileFn tables in
 * the region's account Postgres (`FILEFN_DATABASE_URL`), through the same
 * generated Drizzle schema the account service uses (`filefn-schema.mjs`,
 * copied in by the Dockerfile). `close()` ends the pool.
 */
export default function createDatabase(env) {
  return openFileFnDatabase(env, schema);
}
