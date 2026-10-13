/**
 * @deprecated - use fileStore.downloadFromBlob instead
 * Downloads a json file
 * @param data stringified json
 * @param label
 */
export function downloadJson(data: string, label: string | null = null) {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = (label ?? "data") + ".json";
  link.click();
  URL.revokeObjectURL(url);
}
