CREATE TABLE "account_file_deletions" (
	"id" text PRIMARY KEY NOT NULL,
	"principal_id" text NOT NULL,
	"file_id" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" bigint NOT NULL,
	"last_error" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_file_deletions_next_attempt_at_idx" ON "account_file_deletions" USING btree ("next_attempt_at");