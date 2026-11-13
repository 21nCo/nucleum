import { defineConfig } from '@superfunctions/cli';
import { getSchema as getFileFnSchema } from '@filefn/server';

/**
 * FileFn schema source for `superfunctions generate-schema --library filefn`.
 * FileFn tables live in the regional account Postgres beside DataFn and keep
 * FileFn's default `filefn` table prefix.
 */
export const filefnSchemaSource = {
  [Symbol.for('superfunctions.app')]: {
    libraryName: 'filefn',
    packageName: '@filefn/server'
  },
  config: { namespace: 'filefn' },
  getSchema: () => getFileFnSchema({ namespace: 'filefn' })
};

export default defineConfig({
  adapter: {
    type: 'drizzle',
    drizzle: {
      dialect: 'postgres',
      connectionString: process.env.DATABASE_URL
        ?? 'postgres://postgres:postgres@127.0.0.1:5432/nucleus_account'
    }
  },
  libraries: ['./src/auth.ts', './superfunctions.config.mjs'],
  migrationsDir: './drizzle'
});
