import packageJson from "../package.json";
import config from "@nucleum/products/pointron/pointron.config";
import PointronBaseLayer from "@nucleum/composition/layers/PointronBaseLayer.svelte";

const { version, build } = packageJson;

export default {
  version,
  build,
  ...config,
  base: PointronBaseLayer
};
