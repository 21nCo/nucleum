import {
  contextZone,
  getContextZonePane,
  type ContextZoneSubViewRegistration,
  type ContextZoneViews
} from "@nucleum/shell/topNav/contextZone/context-zone";

/**
 * Registers an in-page sub switcher with the context zone for as long as the
 * calling component is mounted, so Option+Shift+Arrow steps through its
 * views. Call it during component initialisation; `read` returns the current
 * views. Call `touch` when the user picks a view in the switcher.
 */
export function useContextZoneSubViews(
  read: () => ContextZoneViews | undefined
): { touch: () => void } {
  const pane = getContextZonePane();
  let registration: ContextZoneSubViewRegistration | undefined;
  $effect(() => {
    const current = contextZone.registerSubViews(pane, {
      get views() {
        return read();
      }
    });
    registration = current;
    return () => {
      current.release();
      if (registration === current) registration = undefined;
    };
  });
  return { touch: () => registration?.touch() };
}
