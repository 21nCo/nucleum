CREATE TABLE "filefn_file_artifacts" (
	"artifactId" text NOT NULL,
	"createdAt" text NOT NULL,
	"fileId" text NOT NULL,
	"kind" text NOT NULL,
	"metadata" json,
	"mimeType" text NOT NULL,
	"size" integer,
	"storageKey" text NOT NULL,
	"versionId" text NOT NULL,
	CONSTRAINT "filefn_file_artifacts_artifactId_unique" UNIQUE("artifactId")
);
--> statement-breakpoint
CREATE TABLE "filefn_file_permissions" (
	"canDelete" boolean NOT NULL,
	"canRead" boolean NOT NULL,
	"canShare" boolean NOT NULL,
	"canWrite" boolean NOT NULL,
	"createdAt" text NOT NULL,
	"expiresAt" text,
	"fileId" text NOT NULL,
	"permissionId" text NOT NULL,
	"role" text,
	"tenantId" text,
	"userId" text,
	CONSTRAINT "filefn_file_permissions_permissionId_unique" UNIQUE("permissionId")
);
--> statement-breakpoint
CREATE TABLE "filefn_file_shares" (
	"createdAt" text NOT NULL,
	"downloads" integer NOT NULL,
	"expiresAt" text,
	"fileId" text NOT NULL,
	"maxDownloads" integer,
	"requiresAuth" boolean NOT NULL,
	"revokedAt" text,
	"tokenHash" text NOT NULL,
	"versionId" text,
	CONSTRAINT "filefn_file_shares_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "filefn_file_versions" (
	"checksumSha256Base64" text,
	"createdAt" text NOT NULL,
	"fileId" text NOT NULL,
	"mimeType" text NOT NULL,
	"size" integer NOT NULL,
	"storageKey" text NOT NULL,
	"tenantId" text,
	"versionId" text NOT NULL,
	CONSTRAINT "filefn_file_versions_versionId_unique" UNIQUE("versionId")
);
--> statement-breakpoint
CREATE TABLE "filefn_files" (
	"createdAt" text NOT NULL,
	"currentVersionId" text NOT NULL,
	"fileId" text NOT NULL,
	"metadata" json,
	"mimeType" text NOT NULL,
	"name" text NOT NULL,
	"ownerId" text NOT NULL,
	"policy" text NOT NULL,
	"size" integer NOT NULL,
	"tenantId" text,
	"updatedAt" text NOT NULL,
	"visibility" text NOT NULL,
	CONSTRAINT "filefn_files_fileId_unique" UNIQUE("fileId")
);
--> statement-breakpoint
CREATE TABLE "filefn_upload_parts" (
	"checksumSha256Base64" text,
	"etag" text NOT NULL,
	"partNumber" integer NOT NULL,
	"size" integer NOT NULL,
	"uploadSessionId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filefn_upload_sessions" (
	"chunkSizeBytes" integer NOT NULL,
	"completionVersionId" text,
	"createdAt" text NOT NULL,
	"expiresAt" text NOT NULL,
	"fileId" text,
	"fileName" text NOT NULL,
	"idempotencyKey" text,
	"idempotencyPayloadHash" text,
	"metadata" json,
	"mimeType" text NOT NULL,
	"ownerId" text NOT NULL,
	"policy" text NOT NULL,
	"size" integer NOT NULL,
	"status" text NOT NULL,
	"storageKey" text NOT NULL,
	"storageUploadId" text,
	"tenantId" text,
	"totalParts" integer NOT NULL,
	"uploadMode" text NOT NULL,
	"uploadSessionId" text NOT NULL,
	"uploadSessionToken" text,
	"uploadSessionTokenHash" text,
	CONSTRAINT "filefn_upload_sessions_uploadSessionId_unique" UNIQUE("uploadSessionId")
);
--> statement-breakpoint
CREATE INDEX "filefn_artifacts_file_idx" ON "filefn_file_artifacts" USING btree ("fileId");--> statement-breakpoint
CREATE INDEX "filefn_artifacts_version_idx" ON "filefn_file_artifacts" USING btree ("versionId");--> statement-breakpoint
CREATE INDEX "filefn_perms_file_idx" ON "filefn_file_permissions" USING btree ("fileId");--> statement-breakpoint
CREATE INDEX "filefn_perms_user_idx" ON "filefn_file_permissions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "filefn_shares_file_idx" ON "filefn_file_shares" USING btree ("fileId");--> statement-breakpoint
CREATE INDEX "filefn_versions_checksum_idx" ON "filefn_file_versions" USING btree ("checksumSha256Base64","tenantId");--> statement-breakpoint
CREATE INDEX "filefn_versions_file_idx" ON "filefn_file_versions" USING btree ("fileId");--> statement-breakpoint
CREATE INDEX "filefn_files_owner_idx" ON "filefn_files" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "filefn_files_tenant_idx" ON "filefn_files" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "filefn_parts_session_idx" ON "filefn_upload_parts" USING btree ("uploadSessionId");--> statement-breakpoint
CREATE INDEX "filefn_sessions_expires_idx" ON "filefn_upload_sessions" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "filefn_sessions_idem_idx" ON "filefn_upload_sessions" USING btree ("idempotencyKey");