import { copyToClipboard } from "@21n/shared-utils/clipboard";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

function resolveLinkForResource(resource: string) {
  return (
    "http://" +
    (import.meta.env?.VITE_HOST ?? window.location.host) +
    "/?" +
    new URLSearchParams({
      [AccessMode.PAGE]: resource,
      [AppSearchParam.MAX]: "true"
    }).toString()
  );
}

/** Copies the shell resource URL using the existing deployment host policy. */
export function copyResourceLinkToClipboard(id: IRecordId) {
  const link = resolveLinkForResource(id.toString());
  copyToClipboard(link);
}
