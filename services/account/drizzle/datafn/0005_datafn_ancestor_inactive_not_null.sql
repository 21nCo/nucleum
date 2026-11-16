UPDATE "node" SET "is_ancestor_inactive" = false WHERE "is_ancestor_inactive" IS NULL;--> statement-breakpoint
UPDATE "objective" SET "is_ancestor_inactive" = false WHERE "is_ancestor_inactive" IS NULL;--> statement-breakpoint
UPDATE "task" SET "is_ancestor_inactive" = false WHERE "is_ancestor_inactive" IS NULL;--> statement-breakpoint
ALTER TABLE "node" ALTER COLUMN "is_ancestor_inactive" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "objective" ALTER COLUMN "is_ancestor_inactive" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "is_ancestor_inactive" SET NOT NULL;
