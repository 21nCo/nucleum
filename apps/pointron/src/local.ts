import packageJson from "../package.json";
import config from "$lib/client/products/pointron/pointron.config";

const { version, build } = packageJson;

export default {
  version,
  build,
  ...config
};
