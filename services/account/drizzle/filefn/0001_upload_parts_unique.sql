-- @filefn/server getSchema() declares the filefn_parts_unique constraint, which
-- the Superfunctions Drizzle generator does not render. FileFn records a part
-- after a read-then-create check, so this constraint keeps concurrent retries
-- of one part from storing two rows.
ALTER TABLE "filefn_upload_parts" ADD CONSTRAINT "filefn_parts_unique" UNIQUE("uploadSessionId","partNumber");
