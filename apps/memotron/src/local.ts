import packageJson from "../package.json";
import config from "$lib/client/products/memotron/memotron.config";

const version = packageJson.version;
const build = packageJson.build;

export default {
  version,
  build,
  ...config
};
