import {
  contextZone,
  getContextZonePane,
  type ContextZoneSubViewOptions,
  type ContextZoneSubViewRegistration,
  type ContextZoneViews
} from "@nucleum/shell/topNav/contextZone/context-zone";

/**
 * Registers an in-page switcher with the context zone for as long as the
 * calling component is mounted, so the keyboard steps through its views:
 * Option+Shift+Left/Right for horizontal switchers, Option+Up/Down for
 * vertical lists (`options.axis`). Call it during component initialisation; `read` returns the current
 * views. Call `touch` when the user picks a view in the switcher.
 */
export function useContextZoneSubViews(
  read: () => ContextZoneViews | undefined,
  options: ContextZoneSubViewOptions = {}
): { touch: () => void } {
  const pane = getContextZonePane();
  let registration: ContextZoneSubViewRegistration | undefined;
  $effect(() => {
    const current = contextZone.registerSubViews(
      pane,
      {
        get views() {
          return read();
        }
      },
      options
    );
    registration = current;
    return () => {
      current.release();
      if (registration === current) registration = undefined;
    };
  });
  return { touch: () => registration?.touch() };
}
