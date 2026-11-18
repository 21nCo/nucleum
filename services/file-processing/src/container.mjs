import { pathToFileURL } from 'node:url';
import { createFileFn, createProcessingJobHandler } from '@filefn/server';
import { createR2StorageAdapter } from '@superfunctions/storage-r2';
import {
  createJobServer,
  createTesseractCliOCRProvider,
  loadDatabase,
  readContainerConfig
} from '../../filefn/processing/container/dist/main.js';
import { readNucleumContainerConfig } from './container-config.mjs';
import { createNucleumProcessors } from './processors.mjs';

/**
 * Starts the FILE-9 job server (`POST /jobs`, `GET /health`), imported from
 * the base image's container entry (`filefn/processing/container`), with
 * Nucleum's processors instead of the image's defaults. Configuration is the FILE-9
 * environment (`FILEFN_R2_*`, `FILEFN_DATABASE`, `FILEFN_NAMESPACE`,
 * `FILEFN_PROCESSING_MAX_RETRIES`, ...); `FILEFN_PROCESSORS` is ignored and not
 * validated.
 */
export async function startNucleumContainer(env) {
  const config = readNucleumContainerConfig(env, readContainerConfig);
  const database = await loadDatabase(config.database, env);
  try {
    const fileFn = createFileFn({
      database,
      storage: createR2StorageAdapter(config.storage),
      namespace: config.namespace,
      processing: {
        enabled: true,
        processors: createNucleumProcessors({
          ocrLanguage: config.ocrLanguage,
          ocrProvider: createTesseractCliOCRProvider()
        })
      }
    });
    const server = createJobServer({
      handler: createProcessingJobHandler(fileFn, { maxRetries: config.maxRetries }),
      token: config.token,
      maxConcurrentJobs: config.maxConcurrentJobs,
      maxJobWaitMs: config.maxJobWaitMs,
      maxBodyBytes: config.maxBodyBytes,
      onError: (error) => console.error('[nucleum-file-processing] job failed', error)
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, () => {
        server.off('error', reject);
        resolve();
      });
    });
    let closing;
    return {
      port: server.address().port,
      close() {
        closing ??= (async () => {
          const closed = new Promise((resolve) => server.close(() => resolve()));
          server.closeIdleConnections();
          await closed;
          await server.drainJobs();
          await database.close();
        })();
        return closing;
      }
    };
  } catch (error) {
    await database.close().catch(() => {});
    throw error;
  }
}

async function main() {
  const running = await startNucleumContainer(process.env);
  console.log(`[nucleum-file-processing] listening on port ${running.port}`);
  const stop = (signal) => {
    console.log(`[nucleum-file-processing] ${signal}: finishing running jobs`);
    running.close().then(
      () => process.exit(0),
      (error) => {
        console.error('[nucleum-file-processing] shutdown failed', error);
        process.exit(1);
      }
    );
  };
  process.once('SIGTERM', () => stop('SIGTERM'));
  process.once('SIGINT', () => stop('SIGINT'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error('[nucleum-file-processing] failed to start:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
