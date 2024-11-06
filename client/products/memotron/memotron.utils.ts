import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import type { NodeType } from "$lib/client/products/memotron/node/node.type";

import { copyToClipboard } from "$lib/client/utils/utils";
import { enumToCamelCase } from "$lib/shared/utils/text.utils";
import { generateResourceId } from "$lib/client/components/flux/flux.utils";
import type { IRecordId } from "$lib/client/types/data.type";

function resolveLinkForResource(resource: string) {
  return (
    "http://" +
    (import.meta.env?.VITE_HOST ?? window.location.host) +
    "/?focus=" +
    resource
  );
}

export function copyResourceLinkToClipboard(id: IRecordId) {
  const link = resolveLinkForResource(id.toString());
  copyToClipboard(link);
}

/**
 * Generates a node id using the externalId and type.
 * @param externalId
 * @param type NodeType
 * @returns
 */
export function generateSyncedResourceId(externalId: string, type: NodeType) {
  return generateResourceId(Resource.node, {
    prefix: enumToCamelCase(type),
    id: externalId
  });
}

/**
 * Creates a seprate thread for taco functions to avoid blocking the main thread.
 */
export const tacoWorker = new Worker(
  new URL("$lib/client/products/memotron/taco/taco.worker.ts", import.meta.url),
  { type: "module" }
);

export function resolveFileUploadErrorMessage(
  errors: { file: File; type: string }[],
  params?: {
    maxFileSizeMB?: number;
  }
) {
  let error = "";
  errors.forEach((err) => {
    error = (error ? error + ", " : "") + resolveErroLabel(err.file, err.type);
  });
  return error;

  function resolveErroLabel(file: File, type: string) {
    let error = "";
    if (type === "type") {
      const extension = file.name.split(".").pop();
      error = `File type .${extension} not supported`;
    } else if (type === "size") {
      error = `File size exceeds the maximum limit of ${
        params?.maxFileSizeMB
      }MB`;
    }
    return error;
  }
}
