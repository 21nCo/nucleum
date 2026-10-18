import { signout } from "@nucleum/client/runtime/account/session-cleanup";
import { goto } from "@nucleum/client/runtime/navigation/navigation-request";

/** Preserves the legacy HTTP recovery sequence after session validation fails. */
export async function recoverInvalidAccountSession() {
  await signout();
  goto("/account/login");
  window.location.reload();
}
