import { copyToClipboard } from "@21n/shared-utils/clipboard";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

function resolveLinkForResource(resource: string) {
  return (
    "http://" +
    (import.meta.env?.VITE_HOST ?? window.location.host) +
    "/?full=" +
    resource
  );
}

/** Copies the shell resource URL using the existing deployment host policy. */
export function copyResourceLinkToClipboard(id: IRecordId) {
  const link = resolveLinkForResource(id.toString());
  copyToClipboard(link);
}
