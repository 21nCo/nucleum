/** Deletes an IndexedDB database and rejects when another connection blocks deletion. */
export function deleteIndexedDbDatabase(name: string) {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error(`Unable to delete ${name}`));
    request.onblocked = () => reject(new Error(`Deletion blocked for ${name}`));
  });
}
