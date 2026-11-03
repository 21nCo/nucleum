ALTER TABLE "space_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "space_items" CASCADE;--> statement-breakpoint
DROP INDEX "space_type_idx";--> statement-breakpoint
ALTER TABLE "space" ADD COLUMN "view" text DEFAULT 'sidenav' NOT NULL;--> statement-breakpoint
ALTER TABLE "space" DROP COLUMN "type";