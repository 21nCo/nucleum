/**
 * Resolves an account actor id to its DataFn user namespace.
 */
export function resolveAccountUserNamespace(actorId: string): string {
  const normalized = actorId.trim();
  return normalized.startsWith('user:') ? normalized : `user:${normalized}`;
}

/**
 * Resolves an account actor id to its DataFn user principal.
 */
export function resolveAccountUserPrincipal(actorId: string): string {
  return resolveAccountUserNamespace(actorId);
}
