import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

/**
 * Builds a MapLibre map after pointing MapLibre at the worker file the bundler
 * emits. MapLibre 6 loads its worker from a separate file next to its own
 * module, which the app bundle does not contain. The setup runs inside this
 * function, not at module load, so tree-shaking cannot drop it.
 */
export function createMaplibreMap(options: maplibregl.MapOptions) {
  if (maplibregl.getWorkerUrl() !== maplibreWorkerUrl) {
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
  }
  return new maplibregl.Map(options);
}
