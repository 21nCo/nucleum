CREATE TABLE "__datafn_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"namespace" text,
	"server_seq" integer,
	"resource" text,
	"record_id" text,
	"op" text,
	"record" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "__datafn_idempotency" (
	"id" text PRIMARY KEY NOT NULL,
	"namespace" text,
	"client_id" text,
	"mutation_id" text,
	"result" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "__datafn_meta" (
	"id" text PRIMARY KEY NOT NULL,
	"namespace" text,
	"next_server_seq" integer
);
--> statement-breakpoint
CREATE TABLE "__datafn_permissions_global" (
	"__ns" text,
	"id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_ns" text NOT NULL,
	"resource_id" text,
	"principal_id" text NOT NULL,
	"level" text NOT NULL,
	"grant_kind" text NOT NULL,
	"source_ref" text,
	"granted_by" text NOT NULL,
	"granted_at" bigint NOT NULL,
	"revoked_at" bigint,
	CONSTRAINT "__datafn_permissions_global_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "__datafn_principal_hierarchy" (
	"__ns" text,
	"id" text NOT NULL,
	"namespace" text NOT NULL,
	"principal_id" text NOT NULL,
	"parent_principal_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"revoked_at" bigint,
	CONSTRAINT "__datafn_principal_hierarchy_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "__datafn_principal_memberships" (
	"__ns" text,
	"id" text NOT NULL,
	"namespace" text NOT NULL,
	"actor_id" text NOT NULL,
	"principal_id" text NOT NULL,
	"granted_at" bigint NOT NULL,
	"revoked_at" bigint,
	CONSTRAINT "__datafn_principal_memberships_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "__datafn_seed" (
	"id" text PRIMARY KEY NOT NULL,
	"namespace" text,
	"seed_id" text,
	"status" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "accessLog" (
	"__ns" text NOT NULL,
	"action" text,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"event" text,
	"id" text NOT NULL,
	"resource" text,
	"resource_id" text,
	"timestamp" bigint,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"value" jsonb,
	CONSTRAINT "accessLog___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "capture" (
	"__ns" text NOT NULL,
	"avatar" jsonb,
	"body" jsonb,
	"children_with_structure" jsonb NOT NULL,
	"clipboard" jsonb,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"file" text,
	"id" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"label" text,
	"links" jsonb,
	"method" text NOT NULL,
	"node_id" text,
	"property_config" jsonb,
	"property_values" jsonb,
	"refresh_id" numeric NOT NULL,
	"root_structure" jsonb NOT NULL,
	"trashed_at" bigint,
	"trashed_by" text,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "capture___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"__ns" text NOT NULL,
	"avatar" jsonb,
	"cover" text,
	"cover_layout" jsonb,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"description" text,
	"id" text NOT NULL,
	"import_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_capture_shortcut_enabled" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"label" text,
	"query" text,
	"resource" text NOT NULL,
	"trashed_at" bigint,
	"trashed_by" text,
	"type" text NOT NULL,
	"type_to_extend" text,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "collection___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"__ns" text NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" bigint,
	"created_by" text,
	"from_resource" text NOT NULL,
	"id" text NOT NULL,
	"item_id" text NOT NULL,
	"location" text,
	"sort_order" numeric,
	"updated_at" bigint,
	"updated_by" text,
	CONSTRAINT "collection_items___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "collection_properties" (
	"__ns" text NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" bigint,
	"created_by" text,
	"id" text NOT NULL,
	"property_id" text NOT NULL,
	"sort_order" numeric,
	"updated_at" bigint,
	"updated_by" text,
	CONSTRAINT "collection_properties___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "collection_views" (
	"__ns" text NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" bigint,
	"created_by" text,
	"id" text NOT NULL,
	"sort_order" numeric,
	"updated_at" bigint,
	"updated_by" text,
	"view_id" text NOT NULL,
	CONSTRAINT "collection_views___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "datafnTimezoneChange" (
	"__ns" text NOT NULL,
	"effective_from" numeric NOT NULL,
	"id" text NOT NULL,
	"recorded_at" numeric NOT NULL,
	"source" text,
	"timezone" text NOT NULL,
	CONSTRAINT "datafnTimezoneChange___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"__ns" text NOT NULL,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"end_unix" numeric,
	"event" text NOT NULL,
	"id" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"label" text,
	"start_unix" numeric,
	"trashed_at" bigint,
	"trashed_by" text,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"value" jsonb,
	"visibility" text,
	CONSTRAINT "event___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "file" (
	"__ns" text NOT NULL,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"data" jsonb,
	"duration" numeric,
	"id" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_meta" boolean DEFAULT false,
	"label" text,
	"metadata" jsonb,
	"name" text,
	"size" numeric NOT NULL,
	"thumbnail_data" jsonb,
	"thumbnail_url" text,
	"trashed_at" bigint,
	"trashed_by" text,
	"type" text NOT NULL,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"url" text,
	"visibility" text,
	CONSTRAINT "file___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "kv" (
	"__ns" text NOT NULL,
	"id" text NOT NULL,
	"value" jsonb,
	CONSTRAINT "kv___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "linkTag" (
	"__ns" text NOT NULL,
	"avatar" jsonb,
	"color" numeric,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"group" text,
	"id" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"label" text,
	"trashed_at" bigint,
	"trashed_by" text,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "linkTag___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "node" (
	"__ns" text NOT NULL,
	"avatar" jsonb,
	"body" jsonb,
	"body_search" text,
	"config" jsonb,
	"content_type" text NOT NULL,
	"cover" text,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"creation_context" text,
	"date" bigint,
	"file" text,
	"id" text NOT NULL,
	"import_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false,
	"is_ancestor_inactive" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"label" text,
	"label_search" text,
	"md_child_order" jsonb,
	"md_parent" jsonb,
	"md_text" text,
	"metadata" jsonb,
	"meta_type" text,
	"notes" text,
	"parent" text,
	"parent_path" text,
	"preview_image" text,
	"sort_order" numeric,
	"text" text,
	"trashed_at" bigint,
	"trashed_by" text,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"url" text,
	"visibility" text,
	CONSTRAINT "node___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "objective" (
	"__ns" text NOT NULL,
	"color" numeric,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"description" jsonb,
	"end_date" bigint,
	"id" text NOT NULL,
	"import_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false,
	"is_ancestor_inactive" boolean DEFAULT false,
	"is_pinned_for_quick_focus" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"label" text,
	"parent_id" text,
	"parent_path" text,
	"sort_order" numeric,
	"span_scale" text,
	"start_date" bigint,
	"status" text NOT NULL,
	"sub_objectives_layout" text,
	"tabs_order" jsonb,
	"trashed_at" bigint,
	"trashed_by" text,
	"type" text NOT NULL,
	"ui_state" jsonb,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "objective___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "property" (
	"__ns" text NOT NULL,
	"avatar" jsonb,
	"config" jsonb,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"default_value" jsonb,
	"description" text,
	"id" text NOT NULL,
	"import_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_multi" boolean DEFAULT false,
	"is_required" boolean DEFAULT false,
	"is_show_on_capture" boolean DEFAULT false,
	"is_show_on_node_page" boolean DEFAULT false,
	"label" text,
	"options" jsonb,
	"order" numeric,
	"property_type" text,
	"resource" text,
	"trashed_at" bigint,
	"trashed_by" text,
	"type" text,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "property___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "property_values" (
	"__ns" text NOT NULL,
	"collection_id" text,
	"created_at" bigint,
	"created_by" text,
	"from_resource" text NOT NULL,
	"id" text NOT NULL,
	"item_id" text NOT NULL,
	"property_id" text NOT NULL,
	"updated_at" bigint,
	"updated_by" text,
	"value" jsonb,
	CONSTRAINT "property_values___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "publicLink" (
	"__ns" text NOT NULL,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"expires_at" bigint,
	"id" text NOT NULL,
	"level" text NOT NULL,
	"principal_id" text NOT NULL,
	"record_id" text,
	"resource" text NOT NULL,
	"revoked_at" bigint,
	"scope" text NOT NULL,
	"token_hash" text NOT NULL,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	CONSTRAINT "publicLink___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "record_links" (
	"__ns" text NOT NULL,
	"created_at" bigint,
	"created_by" text,
	"from_resource" text NOT NULL,
	"id" text NOT NULL,
	"in" text NOT NULL,
	"link_type" text,
	"location" text,
	"out" text NOT NULL,
	"tags" jsonb,
	"to_resource" text NOT NULL,
	"updated_at" bigint,
	"updated_by" text,
	CONSTRAINT "record_links___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"__ns" text NOT NULL,
	"blocks" jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"elapsed" numeric NOT NULL,
	"end" text,
	"end_unix" numeric NOT NULL,
	"extended" numeric NOT NULL,
	"id" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"manual_entry_id" text,
	"notes" jsonb,
	"planned_end" text,
	"planned_end_unix" numeric,
	"start" text,
	"start_unix" numeric NOT NULL,
	"trashed_at" bigint,
	"trashed_by" text,
	"type" text NOT NULL,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "session___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "sessionLog" (
	"__ns" text NOT NULL,
	"break_time" numeric,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"end" text,
	"end_unix" numeric NOT NULL,
	"focus" numeric,
	"id" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"manual_entry_id" text,
	"objective_id" text,
	"session_id" text NOT NULL,
	"start" text,
	"start_unix" numeric NOT NULL,
	"targets" jsonb,
	"task_id" text,
	"task_name" text,
	"trashed_at" bigint,
	"trashed_by" text,
	"tz_offset" numeric,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "sessionLog___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "session_items" (
	"__ns" text NOT NULL,
	"blocks" jsonb,
	"created_at" bigint,
	"created_by" text,
	"id" text NOT NULL,
	"item_id" text NOT NULL,
	"parent_objective_id" text,
	"session_id" text NOT NULL,
	"sort_order" numeric,
	"to_resource" text NOT NULL,
	"updated_at" bigint,
	"updated_by" text,
	CONSTRAINT "session_items___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "space" (
	"__ns" text NOT NULL,
	"avatar" jsonb,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"description" text,
	"id" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_starred" boolean DEFAULT false,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"label" text,
	"trashed_at" bigint,
	"trashed_by" text,
	"type" text NOT NULL,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "space___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "space_items" (
	"__ns" text NOT NULL,
	"created_at" bigint,
	"created_by" text,
	"description" text,
	"id" text NOT NULL,
	"item_id" text NOT NULL,
	"item_type" text,
	"label" text,
	"parent_id" text,
	"sort_order" numeric,
	"space_id" text NOT NULL,
	"to_resource" text NOT NULL,
	"updated_at" bigint,
	"updated_by" text,
	CONSTRAINT "space_items___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"__ns" text NOT NULL,
	"completed_at" bigint,
	"completed_at_unix" numeric,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"date" bigint,
	"date_unix" numeric NOT NULL,
	"estimated" numeric,
	"id" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_checked" boolean DEFAULT false,
	"is_ancestor_inactive" boolean DEFAULT false,
	"label" text,
	"minutes" numeric,
	"objective_id" text,
	"trashed_at" bigint,
	"trashed_by" text,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "task___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "vector" (
	"__ns" text NOT NULL,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"embedding" jsonb NOT NULL,
	"id" text NOT NULL,
	"metadata" jsonb,
	"resource" text NOT NULL,
	"resource_id" text NOT NULL,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	CONSTRAINT "vector___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
CREATE TABLE "view" (
	"__ns" text NOT NULL,
	"arrangement" text,
	"created_at" bigint NOT NULL,
	"created_by" text,
	"density" numeric,
	"group_by" text,
	"id" text NOT NULL,
	"import_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_hide_thumbnail_preview" boolean DEFAULT false,
	"is_hide_thumbnail_title" boolean DEFAULT false,
	"label" text,
	"layout" text NOT NULL,
	"properties" jsonb,
	"sub_group_by" text,
	"tab_by" text,
	"tabs" jsonb,
	"trashed_at" bigint,
	"trashed_by" text,
	"updated_at" bigint NOT NULL,
	"updated_by" text,
	"visibility" text,
	CONSTRAINT "view___ns_id_pk" PRIMARY KEY("__ns","id")
);
--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection___ns_type_to_extend_collection___ns_id_fk" FOREIGN KEY ("__ns","type_to_extend") REFERENCES "public"."collection"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items___ns_collection_id_collection___ns_id_fk" FOREIGN KEY ("__ns","collection_id") REFERENCES "public"."collection"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_properties" ADD CONSTRAINT "collection_properties___ns_collection_id_collection___ns_id_fk" FOREIGN KEY ("__ns","collection_id") REFERENCES "public"."collection"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_properties" ADD CONSTRAINT "collection_properties___ns_property_id_property___ns_id_fk" FOREIGN KEY ("__ns","property_id") REFERENCES "public"."property"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_views" ADD CONSTRAINT "collection_views___ns_collection_id_collection___ns_id_fk" FOREIGN KEY ("__ns","collection_id") REFERENCES "public"."collection"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_views" ADD CONSTRAINT "collection_views___ns_view_id_view___ns_id_fk" FOREIGN KEY ("__ns","view_id") REFERENCES "public"."view"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node" ADD CONSTRAINT "node___ns_file_file___ns_id_fk" FOREIGN KEY ("__ns","file") REFERENCES "public"."file"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node" ADD CONSTRAINT "node___ns_parent_node___ns_id_fk" FOREIGN KEY ("__ns","parent") REFERENCES "public"."node"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objective" ADD CONSTRAINT "objective___ns_parent_id_objective___ns_id_fk" FOREIGN KEY ("__ns","parent_id") REFERENCES "public"."objective"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_values" ADD CONSTRAINT "property_values___ns_property_id_property___ns_id_fk" FOREIGN KEY ("__ns","property_id") REFERENCES "public"."property"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessionLog" ADD CONSTRAINT "sessionLog___ns_session_id_session___ns_id_fk" FOREIGN KEY ("__ns","session_id") REFERENCES "public"."session"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessionLog" ADD CONSTRAINT "sessionLog___ns_objective_id_objective___ns_id_fk" FOREIGN KEY ("__ns","objective_id") REFERENCES "public"."objective"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessionLog" ADD CONSTRAINT "sessionLog___ns_task_id_task___ns_id_fk" FOREIGN KEY ("__ns","task_id") REFERENCES "public"."task"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items___ns_session_id_session___ns_id_fk" FOREIGN KEY ("__ns","session_id") REFERENCES "public"."session"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_items" ADD CONSTRAINT "space_items___ns_space_id_space___ns_id_fk" FOREIGN KEY ("__ns","space_id") REFERENCES "public"."space"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task___ns_objective_id_objective___ns_id_fk" FOREIGN KEY ("__ns","objective_id") REFERENCES "public"."objective"("__ns","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "__datafn_changes_namespace_server_seq_idx" ON "__datafn_changes" USING btree ("namespace","server_seq");--> statement-breakpoint
CREATE INDEX "__datafn_idempotency_namespace_client_mutation_idx" ON "__datafn_idempotency" USING btree ("namespace","client_id","mutation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "__datafn_permissions_global_resource_record_idx" ON "__datafn_permissions_global" USING btree ("resource_type","resource_ns","resource_id","principal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "__datafn_permissions_global_scope_idx" ON "__datafn_permissions_global" USING btree ("resource_type","resource_ns","principal_id","grant_kind");--> statement-breakpoint
CREATE INDEX "idx_perm_principal" ON "__datafn_permissions_global" USING btree ("principal_id");--> statement-breakpoint
CREATE INDEX "idx_perm_resource_ns_principal" ON "__datafn_permissions_global" USING btree ("resource_ns","principal_id");--> statement-breakpoint
CREATE INDEX "idx_perm_resource_lookup" ON "__datafn_permissions_global" USING btree ("resource_type","resource_ns","resource_id");--> statement-breakpoint
CREATE INDEX "idx_perm_active_lookup" ON "__datafn_permissions_global" USING btree ("resource_type","resource_ns","principal_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "__datafn_principal_hierarchy_namespace_principal_parent_idx" ON "__datafn_principal_hierarchy" USING btree ("namespace","principal_id","parent_principal_id");--> statement-breakpoint
CREATE INDEX "idx_hierarchy_principal" ON "__datafn_principal_hierarchy" USING btree ("namespace","principal_id");--> statement-breakpoint
CREATE INDEX "idx_hierarchy_parent" ON "__datafn_principal_hierarchy" USING btree ("namespace","parent_principal_id");--> statement-breakpoint
CREATE INDEX "idx_hierarchy_active" ON "__datafn_principal_hierarchy" USING btree ("namespace","principal_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "__datafn_principal_memberships_namespace_actor_principal_idx" ON "__datafn_principal_memberships" USING btree ("namespace","actor_id","principal_id");--> statement-breakpoint
CREATE INDEX "idx_membership_actor" ON "__datafn_principal_memberships" USING btree ("namespace","actor_id");--> statement-breakpoint
CREATE INDEX "idx_membership_principal" ON "__datafn_principal_memberships" USING btree ("namespace","principal_id");--> statement-breakpoint
CREATE INDEX "idx_membership_active" ON "__datafn_principal_memberships" USING btree ("namespace","actor_id","revoked_at");--> statement-breakpoint
CREATE INDEX "__datafn_seed_namespace_seed_idx" ON "__datafn_seed" USING btree ("namespace","seed_id");--> statement-breakpoint
CREATE INDEX "idx_accessLog___ns" ON "accessLog" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "accessLog_resource_id_idx" ON "accessLog" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "accessLog_resource_idx" ON "accessLog" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "accessLog_action_idx" ON "accessLog" USING btree ("action");--> statement-breakpoint
CREATE INDEX "accessLog_event_idx" ON "accessLog" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_capture___ns" ON "capture" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "capture_method_idx" ON "capture" USING btree ("method");--> statement-breakpoint
CREATE INDEX "idx_capture_visibility" ON "capture" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_capture_created_by_visibility" ON "capture" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "idx_collection___ns" ON "collection" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "collection_type_idx" ON "collection" USING btree ("type");--> statement-breakpoint
CREATE INDEX "collection_resource_idx" ON "collection" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "collection_type_to_extend_idx" ON "collection" USING btree ("type_to_extend");--> statement-breakpoint
CREATE INDEX "idx_collection_visibility" ON "collection" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_collection_created_by_visibility" ON "collection" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "collection_type_to_extend_rel_idx" ON "collection" USING btree ("__ns","type_to_extend");--> statement-breakpoint
CREATE INDEX "idx_collection_items___ns" ON "collection_items" USING btree ("__ns");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_items_item_id_collection_id_idx" ON "collection_items" USING btree ("__ns","from_resource","item_id","collection_id");--> statement-breakpoint
CREATE INDEX "collection_items_item_id_idx" ON "collection_items" USING btree ("__ns","from_resource","item_id");--> statement-breakpoint
CREATE INDEX "collection_items_collection_id_idx" ON "collection_items" USING btree ("__ns","collection_id");--> statement-breakpoint
CREATE INDEX "idx_collection_properties___ns" ON "collection_properties" USING btree ("__ns");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_properties_collection_id_property_id_idx" ON "collection_properties" USING btree ("__ns","collection_id","property_id");--> statement-breakpoint
CREATE INDEX "collection_properties_collection_id_idx" ON "collection_properties" USING btree ("__ns","collection_id");--> statement-breakpoint
CREATE INDEX "collection_properties_property_id_idx" ON "collection_properties" USING btree ("__ns","property_id");--> statement-breakpoint
CREATE INDEX "idx_collection_views___ns" ON "collection_views" USING btree ("__ns");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_views_collection_id_view_id_idx" ON "collection_views" USING btree ("__ns","collection_id","view_id");--> statement-breakpoint
CREATE INDEX "collection_views_collection_id_idx" ON "collection_views" USING btree ("__ns","collection_id");--> statement-breakpoint
CREATE INDEX "collection_views_view_id_idx" ON "collection_views" USING btree ("__ns","view_id");--> statement-breakpoint
CREATE INDEX "idx_datafnTimezoneChange___ns" ON "datafnTimezoneChange" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "idx_event___ns" ON "event" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "event_event_idx" ON "event" USING btree ("event");--> statement-breakpoint
CREATE INDEX "event_start_unix_idx" ON "event" USING btree ("start_unix");--> statement-breakpoint
CREATE INDEX "event_end_unix_idx" ON "event" USING btree ("end_unix");--> statement-breakpoint
CREATE INDEX "idx_event_visibility" ON "event" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_event_created_by_visibility" ON "event" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "idx_file___ns" ON "file" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "file_type_idx" ON "file" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_file_visibility" ON "file" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_file_created_by_visibility" ON "file" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "idx_kv___ns" ON "kv" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "idx_linkTag___ns" ON "linkTag" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "idx_linkTag_visibility" ON "linkTag" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_linkTag_created_by_visibility" ON "linkTag" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "idx_node___ns" ON "node" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "node_content_type_idx" ON "node" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "node_meta_type_idx" ON "node" USING btree ("meta_type");--> statement-breakpoint
CREATE INDEX "node_parent_idx" ON "node" USING btree ("parent");--> statement-breakpoint
CREATE INDEX "idx_node_visibility" ON "node" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_node_created_by_visibility" ON "node" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "node_file_rel_idx" ON "node" USING btree ("__ns","file");--> statement-breakpoint
CREATE INDEX "node_parent_rel_idx" ON "node" USING btree ("__ns","parent");--> statement-breakpoint
CREATE INDEX "idx_objective___ns" ON "objective" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "objective_type_idx" ON "objective" USING btree ("type");--> statement-breakpoint
CREATE INDEX "objective_status_idx" ON "objective" USING btree ("status");--> statement-breakpoint
CREATE INDEX "objective_parent_id_idx" ON "objective" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "objective_parent_path_idx" ON "objective" USING btree ("parent_path");--> statement-breakpoint
CREATE INDEX "idx_objective_visibility" ON "objective" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_objective_created_by_visibility" ON "objective" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "objective_parent_id_rel_idx" ON "objective" USING btree ("__ns","parent_id");--> statement-breakpoint
CREATE INDEX "objective_parent_path_rel_idx" ON "objective" USING btree ("__ns","parent_path");--> statement-breakpoint
CREATE INDEX "idx_property___ns" ON "property" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "property_type_idx" ON "property" USING btree ("type");--> statement-breakpoint
CREATE INDEX "property_resource_idx" ON "property" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "property_property_type_idx" ON "property" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "idx_property_visibility" ON "property" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_property_created_by_visibility" ON "property" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "idx_property_values___ns" ON "property_values" USING btree ("__ns");--> statement-breakpoint
CREATE UNIQUE INDEX "property_values_item_id_property_id_idx" ON "property_values" USING btree ("__ns","from_resource","item_id","property_id");--> statement-breakpoint
CREATE INDEX "property_values_item_id_idx" ON "property_values" USING btree ("__ns","from_resource","item_id");--> statement-breakpoint
CREATE INDEX "property_values_property_id_idx" ON "property_values" USING btree ("__ns","property_id");--> statement-breakpoint
CREATE INDEX "idx_publicLink___ns" ON "publicLink" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "publicLink_principal_id_idx" ON "publicLink" USING btree ("principal_id");--> statement-breakpoint
CREATE INDEX "publicLink_resource_idx" ON "publicLink" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "publicLink_record_id_idx" ON "publicLink" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "publicLink_scope_idx" ON "publicLink" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "publicLink_revoked_at_idx" ON "publicLink" USING btree ("revoked_at");--> statement-breakpoint
CREATE INDEX "idx_record_links___ns" ON "record_links" USING btree ("__ns");--> statement-breakpoint
CREATE UNIQUE INDEX "record_links_in_out_idx" ON "record_links" USING btree ("__ns","from_resource","in","to_resource","out","link_type");--> statement-breakpoint
CREATE INDEX "record_links_in_idx" ON "record_links" USING btree ("__ns","from_resource","in");--> statement-breakpoint
CREATE INDEX "record_links_out_idx" ON "record_links" USING btree ("__ns","to_resource","out");--> statement-breakpoint
CREATE INDEX "idx_session___ns" ON "session" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "session_start_unix_idx" ON "session" USING btree ("start_unix");--> statement-breakpoint
CREATE INDEX "session_type_idx" ON "session" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_session_visibility" ON "session" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_session_created_by_visibility" ON "session" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "idx_sessionLog___ns" ON "sessionLog" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "sessionLog_start_unix_idx" ON "sessionLog" USING btree ("start_unix");--> statement-breakpoint
CREATE INDEX "sessionLog_objective_id_idx" ON "sessionLog" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "sessionLog_session_id_idx" ON "sessionLog" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessionLog_task_id_idx" ON "sessionLog" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_sessionLog_visibility" ON "sessionLog" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_sessionLog_created_by_visibility" ON "sessionLog" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "sessionLog_session_id_rel_idx" ON "sessionLog" USING btree ("__ns","session_id");--> statement-breakpoint
CREATE INDEX "sessionLog_objective_id_rel_idx" ON "sessionLog" USING btree ("__ns","objective_id");--> statement-breakpoint
CREATE INDEX "sessionLog_task_id_rel_idx" ON "sessionLog" USING btree ("__ns","task_id");--> statement-breakpoint
CREATE INDEX "idx_session_items___ns" ON "session_items" USING btree ("__ns");--> statement-breakpoint
CREATE UNIQUE INDEX "session_items_session_id_item_id_idx" ON "session_items" USING btree ("__ns","session_id","to_resource","item_id");--> statement-breakpoint
CREATE INDEX "session_items_session_id_idx" ON "session_items" USING btree ("__ns","session_id");--> statement-breakpoint
CREATE INDEX "session_items_item_id_idx" ON "session_items" USING btree ("__ns","to_resource","item_id");--> statement-breakpoint
CREATE INDEX "idx_space___ns" ON "space" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "space_type_idx" ON "space" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_space_visibility" ON "space" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_space_created_by_visibility" ON "space" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "idx_space_items___ns" ON "space_items" USING btree ("__ns");--> statement-breakpoint
CREATE UNIQUE INDEX "space_items_space_id_item_id_idx" ON "space_items" USING btree ("__ns","space_id","to_resource","item_id");--> statement-breakpoint
CREATE INDEX "space_items_space_id_idx" ON "space_items" USING btree ("__ns","space_id");--> statement-breakpoint
CREATE INDEX "space_items_item_id_idx" ON "space_items" USING btree ("__ns","to_resource","item_id");--> statement-breakpoint
CREATE INDEX "idx_task___ns" ON "task" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "task_date_unix_idx" ON "task" USING btree ("date_unix");--> statement-breakpoint
CREATE INDEX "task_objective_id_idx" ON "task" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_task_visibility" ON "task" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_task_created_by_visibility" ON "task" USING btree ("created_by","visibility");--> statement-breakpoint
CREATE INDEX "task_objective_id_rel_idx" ON "task" USING btree ("__ns","objective_id");--> statement-breakpoint
CREATE INDEX "idx_vector___ns" ON "vector" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "vector_resource_id_idx" ON "vector" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "vector_resource_idx" ON "vector" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "idx_view___ns" ON "view" USING btree ("__ns");--> statement-breakpoint
CREATE INDEX "view_layout_idx" ON "view" USING btree ("layout");--> statement-breakpoint
CREATE INDEX "view_tab_by_idx" ON "view" USING btree ("tab_by");--> statement-breakpoint
CREATE INDEX "view_group_by_idx" ON "view" USING btree ("group_by");--> statement-breakpoint
CREATE INDEX "idx_view_visibility" ON "view" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_view_created_by_visibility" ON "view" USING btree ("created_by","visibility");