import packageJson from "../package.json";
import config from "@nucleum/products/nucleus/nucleus.config";
import NucleusBaseLayer from "@nucleum/composition/layers/NucleusBaseLayer.svelte";

const { version, build } = packageJson;

export default {
  version,
  build,
  ...config,
  base: NucleusBaseLayer
};
