import packageJson from "../package.json";
import config from "@21n/products/memotron/memotron.config";

const { version, build } = packageJson;

export default {
  version,
  build,
  ...config
};
