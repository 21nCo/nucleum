import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

/**
 * MapLibre with its worker URL set to the worker file the bundler emits.
 * MapLibre 6 loads its worker from a separate file next to its own module,
 * which the app bundle does not contain, so every map imports MapLibre here.
 */
export { maplibregl };
