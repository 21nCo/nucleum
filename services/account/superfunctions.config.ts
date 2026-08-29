import { defineConfig } from '@superfunctions/cli';

export default defineConfig({
  adapter: {
    type: 'drizzle',
    drizzle: {
      dialect: 'postgres',
      connectionString: process.env.DATABASE_URL
        ?? 'postgres://postgres:postgres@127.0.0.1:5432/nucleus_account'
    }
  },
  libraries: ['./src/auth.ts'],
  migrationsDir: './drizzle'
});
