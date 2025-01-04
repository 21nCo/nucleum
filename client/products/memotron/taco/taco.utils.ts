export async function deleteItemsFromCache(
  modelMatch: string,
  cacheName: string = "transformers-cache"
) {
  let transformersCache = await caches.open(cacheName);
  let all = await transformersCache.keys();
  let filteredUrls = all
    .filter((key) => key.url.includes(modelMatch))
    .map((key) => key.url);
  if (!transformersCache) return;
  for (let url of filteredUrls) {
    await transformersCache.delete(url);
  }
}

export async function deleteAllLocalModels() {
  let models = await caches.open("transformers-cache");
  let all = await models.keys();
  if (!models) return;
  for (let url of all) {
    await models.delete(url);
  }
}
