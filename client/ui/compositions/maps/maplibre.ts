import type { Map, MapOptions } from "maplibre-gl";

/**
 * Loads MapLibre and its stylesheet on first use, so pages without a map do
 * not download it, and points MapLibre at the worker file the bundler emits.
 * MapLibre 6 loads its worker from a separate file next to its own module,
 * which the app bundle does not contain.
 */
export async function loadMaplibre() {
  const [maplibregl, { default: maplibreWorkerUrl }] = await Promise.all([
    import("maplibre-gl"),
    import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
    import("maplibre-gl/dist/maplibre-gl.css")
  ]);
  if (maplibregl.getWorkerUrl() !== maplibreWorkerUrl) {
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
  }
  return maplibregl;
}

/**
 * Builds a MapLibre map once MapLibre has loaded.
 */
export async function createMaplibreMap(options: MapOptions): Promise<Map> {
  const maplibregl = await loadMaplibre();
  return new maplibregl.Map(options);
}
