import { bigint, index, integer, pgTable, text } from 'drizzle-orm/pg-core';

/**
 * FileFn deletions owed for permanently deleted `file` records, in the
 * regional sync database. A row is written before DataFn runs the delete and
 * removed once the FileFn file is gone or still in use; rows left behind are
 * retried by the cleanup run from `next_attempt_at`.
 */
export const accountFileDeletions = pgTable('account_file_deletions', {
  id: text('id').primaryKey(),
  principalId: text('principal_id').notNull(),
  fileId: text('file_id').notNull(),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: bigint('next_attempt_at', { mode: 'number' }).notNull(),
  lastError: text('last_error'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull()
}, (table) => [
  index('account_file_deletions_next_attempt_at_idx').on(table.nextAttemptAt)
]);
