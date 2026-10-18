let recoverSession: (() => Promise<void>) | undefined;

/** Installs application policy for an invalid session reported by transport. */
export function configureSessionRecovery(recover: () => Promise<void>) {
  recoverSession = recover;
}

/** Awaits the owning account workflow before completing a failed request. */
export function recoverInvalidSession() {
  if (!recoverSession)
    throw new Error("Session recovery has not been configured");
  return recoverSession();
}
