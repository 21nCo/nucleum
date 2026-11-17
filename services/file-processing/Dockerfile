# Nucleum's FileFn processing container (Cloudflare Containers image).
#
# Derived from the FileFn processing image (superfunctions FILE-9), which has
# sharp compiled against Debian's libvips (with its PDF loader), ffmpeg,
# tesseract and the `POST /jobs` server. Build that base first; Wrangler then
# builds this file from the repository root (`image_build_context`):
#   npm --workspace @21n/file-processing run image:base
#   docker build --platform linux/amd64 -f services/file-processing/Dockerfile .
ARG FILEFN_PROCESSING_BASE_IMAGE=filefn-processing:4b9e12fedff1db8030beb11e8a70d8e857f3661e

FROM ${FILEFN_PROCESSING_BASE_IMAGE}

USER root
# HEVC decoding for HEIC photos: libvips reads HEIF through libheif, whose
# HEVC decoder is a separate plugin.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libheif-plugin-libde265 \
  && rm -rf /var/lib/apt/lists/*

# The FileFn database module's adapter and Postgres driver, installed beside
# the module: the base image keeps @superfunctions/db nested in its own
# workspaces. Everything else (FileFn, sharp, the processors and the R2
# adapter) resolves from the base image's /app/node_modules.
RUN npm install --prefix /app/nucleum --omit=dev --no-save --no-package-lock --ignore-scripts \
    @superfunctions/db@0.2.0 drizzle-orm@0.45.2 postgres@3.4.9

WORKDIR /app/nucleum
COPY services/file-processing/src/ ./src/
# The account service's generated FileFn schema is plain JavaScript.
COPY services/account/src/db/generated/filefn/filefn-schema.ts ./src/filefn-schema.mjs

ENV FILEFN_DATABASE=/app/nucleum/src/database.mjs \
  FILEFN_NAMESPACE=filefn \
  FILEFN_PROCESSING_MAX_RETRIES=3 \
  FILEFN_CONTAINER_MAX_CONCURRENT_JOBS=2

USER node
EXPOSE 8080
CMD ["node", "src/container.mjs"]
