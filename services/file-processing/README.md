# File processing

Nucleum's FileFn processors and the processing container the account
Worker's queue consumer forwards jobs to when an environment's
`fileProcessingMode` (`services/account/config/environments.json`) is
`remote` or `both`.

## Processors

`src/processors.mjs` (`@21n/file-processing`) creates the processors the
container runs, and the account service runs in process on Node:

| Processor | Reads | Writes |
| --- | --- | --- |
| `thumbnail` | PNG, JPEG, WebP, GIF, TIFF | `thumbnail-medium`: 512 px WebP |
| `pdf-preview` | PDF | `pdf-preview-page-1-medium`: the first page as 512 px WebP |
| `heic-convert` | HEIC, HEIF | `converted`: PNG; `thumbnail-medium`: 512 px WebP |
| `ocr` | images and PDFs (first 20 pages) | `ocr-text` |

`src/descriptors.mjs` (`@21n/file-processing/descriptors`) names them without
loading sharp, for the Worker: the producer and the container must configure
the same processor names, since FileFn builds each job's idempotency key from
the producer's. A kind the device already uploaded (`both` mode) is skipped.
Audio and video are not processed.

## Container image

`Dockerfile` builds on the FileFn processing image (superfunctions FILE-9,
pinned by `FILEFN_PROCESSING_BASE_IMAGE`), which has sharp built against
Debian's libvips with its PDF loader, tesseract and the job server
(`POST /jobs`, `GET /health`). It adds libheif's HEVC decoder, the
database module (`src/database.mjs`, over the account service's generated
FileFn schema) and `src/container.mjs`, which starts the FILE-9 server with
the processors above. The build context is the repository root.

Build the base image once per host before Wrangler builds this one:

```sh
npm --workspace @21n/file-processing run image:base
```

The account Worker's `FileProcessingContainer` Durable Object starts the
container with:

- `FILEFN_R2_*`: the region's bucket and R2 credentials, as the Worker uses them;
- `FILEFN_DATABASE_URL`: the Worker's `FILEFN_PROCESSING_DATABASE_URL` Secrets
  Store binding (`NUCLEUS_ACCOUNT_<ENV>_<REGION>_FILEFN_PROCESSING_DATABASE_URL`),
  a direct URL of the region's account Postgres, since Hyperdrive serves only
  Workers.

The image sets `FILEFN_DATABASE`, `FILEFN_NAMESPACE=filefn`,
`FILEFN_PROCESSING_MAX_RETRIES=3` (the consumer's `max_retries`) and
`FILEFN_CONTAINER_MAX_CONCURRENT_JOBS=2` (the consumer's `max_concurrency`).
