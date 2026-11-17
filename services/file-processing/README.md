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
| `pdf-preview` | PDF | `pdf-preview-page-1-medium`: the first page as 512 px WebP; a page sharp cannot render fails the run instead of recording a placeholder |
| `heic-convert` | HEIC, HEIF | `converted`: PNG; `thumbnail-medium`: 512 px WebP |
| `ocr` | images (HEIC and HEIF through their PNG) and PDFs (first 20 pages) | `ocr-text` |

`src/descriptors.mjs` (`@21n/file-processing/descriptors`) names them without
loading sharp, for the Worker: the producer and the container must configure
the same processor names, since FileFn builds each job's idempotency key from
the producer's. A kind the device already uploaded (`both` mode) is skipped.
Audio and video are not processed.

### On Node

The account service on Node loads the npm prebuilt sharp, whose libvips has
no PDF loader and no HEVC decoder. It probes `sharp.format`
(`detectNucleumCodecs`) and runs only what that sharp decodes: usually the
image thumbnail and image OCR. It leaves out `pdf-preview`, PDF OCR,
`heic-convert` and HEIC OCR, logging them once when the service first
resolves FileFn (the first `/files` request or `file` deletion cascade). Full PDF
and HEIC processing needs the container; on Node, PDFs and HEIC photos get no
preview, conversion or OCR. TIDY-540 does not deliver that path: the gap is
recorded as `node-inline-processing-native-codecs` in TIDY-552.

## Container image

`Dockerfile` builds on the FileFn processing image (superfunctions FILE-9,
pinned by `FILEFN_PROCESSING_BASE_IMAGE`), which has sharp built against
Debian's libvips with its PDF loader, tesseract and the job server
(`POST /jobs`, `GET /health`). It adds libheif's HEVC decoder, the
database module (`src/database.mjs`, over the account service's generated
FileFn schema; `src/postgres.mjs` refuses a `FILEFN_DATABASE_URL` unless
every host postgres.js would connect to is loopback or postgres.js would use
`ssl=verify-full`, which it does only for the exact lowercase
`sslmode=verify-full`, `ssl=verify-full` or `sslrootcert=system`. `src/postgres-url.mjs` derives
the host list and TLS mode with postgres.js's own URL steps (host list after
the first `@`, comma-separated), and the container checks the parsed options
of its client again before using it) and `src/container.mjs`, which starts
the FILE-9 server with
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
  Workers. It must verify the server certificate (exact lowercase
  `sslmode=verify-full`, `ssl=verify-full` or `sslrootcert=system`) unless
  every host is loopback; the Durable Object
  applies the same rule
  (`@21n/file-processing/postgres-url`) and refuses to start the container
  otherwise.

The image sets `FILEFN_DATABASE`, `FILEFN_NAMESPACE=filefn`,
`FILEFN_PROCESSING_MAX_RETRIES=3` (the consumer's `max_retries`) and
`FILEFN_CONTAINER_MAX_CONCURRENT_JOBS=2` (the consumer's `max_concurrency`).
