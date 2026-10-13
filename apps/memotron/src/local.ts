import packageJson from "../package.json";
import config from "@nucleum/products/memotron/memotron.config";
import MemotronBaseLayer from "@nucleum/composition/layers/MemotronBaseLayer.svelte";

const { version, build } = packageJson;

export default {
  version,
  build,
  ...config,
  base: MemotronBaseLayer
};
