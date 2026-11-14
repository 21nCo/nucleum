/** Writes text to the clipboard; the promise rejects when the browser refuses. */
export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
