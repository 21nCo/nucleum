import type { ButtonProps } from "../workspace/components/Button";
import getUserAgent from "../workspace/utils/browser";
import { Button } from "$lib/components/Button";

export const load = async () => {
  const module = await import("../workspace/utils/browser");
  const required = require("../workspace/utils/browser");
  return {
    Button,
    module,
    required,
    props: { label: getUserAgent() } satisfies ButtonProps
  };
};
