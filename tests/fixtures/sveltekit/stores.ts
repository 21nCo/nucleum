import { readable } from "svelte/store";

/** Test stand-in for the `$app/stores` page store. */
export const page = readable<{ url: URL; error?: { message: string } | null }>({
  url: new URL("https://local.nucleum.app/"),
  error: null
});
