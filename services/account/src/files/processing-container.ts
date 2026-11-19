import { Container } from "@cloudflare/containers";
import type { AccountWorkerEnv } from "../worker-env.js";
import {
  FILE_PROCESSING_CONTAINER_PORT,
  resolveFileProcessingContainerEnv
} from "./processing.js";

/**
 * Durable Object that runs the region's file processing container
 * (`services/file-processing`). It starts the container on its first request
 * with the region's R2 credentials and FileFn database URL, forwards requests
 * to its job server, and lets it sleep after ten idle minutes.
 */
export class FileProcessingContainer extends Container<AccountWorkerEnv> {
  defaultPort = FILE_PROCESSING_CONTAINER_PORT;
  sleepAfter = "10m";
  #environment: Promise<Record<string, string>> | undefined;

  override async fetch(request: Request): Promise<Response> {
    this.#environment ??= resolveFileProcessingContainerEnv(
      this.env,
      String(this.env.ACCOUNT_REGION_ID ?? "")
    ).catch((error: unknown) => {
      this.#environment = undefined;
      throw error;
    });
    this.envVars = await this.#environment;
    return super.fetch(request);
  }
}
