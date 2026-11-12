<svelte:options runes={true} />

<script lang="ts">
  import { get } from "svelte/store";
  import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
  import {
    findContextActionByKey,
    flattenContextActions,
    runContextAction
  } from "@nucleum/surfaces/commandBar/super-bar";
  import { CONFIRMED_RESOURCE_ACTIONS } from "@nucleum/features/records/resource-action-keys";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { confirmationNotification } from "@nucleum/shared-state/notifications/notification.store";
  import { ButtonVariant } from "@21n/ui/elements/button/button.type";
  import {
    hasLayerInFront,
    isKeyTargetPane,
    isPlainPageKey
  } from "@nucleum/shell/shortcuts/page-keys";
  import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
  import { Action } from "@nucleum/client/config/action.enum";
  import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { logger } from "@nucleum/client/runtime/logging/logger";

  /**
   * Runs the open resource's menu item whose single key was pressed, such as
   * S to star, for the pane the user worked in last. Keys are ignored while
   * typing, with a modifier held, or with a modal, dialog or popover in front.
   */
  function onKeydown(event: KeyboardEvent) {
    if ($context.embed === Embed.HANDSET || !isPlainPageKey(event)) return;
    const entry = get(contextActions.active);
    if (!entry || !isKeyTargetPane(entry.pane)) return;
    let menu;
    try {
      menu = entry.resolve();
    } catch (error) {
      logger.error({ at: "ContextActionKeys", error });
      return;
    }
    const actions = flattenContextActions(menu, {
      hasActionHandler: Boolean(entry.onAction)
    });
    const action = findContextActionByKey(actions, event.key);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    const run = () =>
      runContextAction(action, {
        runCommand: (command) => requireCommandHost().runAction(command),
        onAction: entry.onAction
      });
    if (CONFIRMED_RESOURCE_ACTIONS.has(String(action.item.value))) {
      confirmationNotification.notify({
        title: `${action.label} this ${entry.resource}`,
        message: `Move this ${entry.resource} to trash? You can restore it from Trash.`,
        confirmAction: {
          label: action.label,
          variant: ButtonVariant.DANGER,
          callback: async () => {
            await run();
          }
        }
      });
      return;
    }
    void run();
  }

  /**
   * The edit mode shortcut (Cmd+E) toggles the open resource's own edit mode
   * when it has one, also from inside its editor, so it can close edit mode.
   * Otherwise the shortcut runner toggles the app's edit mode as before.
   */
  function onEditShortcut(event: KeyboardEvent) {
    if (event.defaultPrevented || event.repeat) return;
    if (!keyboardShortcuts.checkShortcut(event, Action.EDIT_MODE)) return;
    if ($context.embed === Embed.HANDSET || hasLayerInFront()) return;
    const entry = get(contextActions.active);
    if (!entry || !isKeyTargetPane(entry.pane)) return;
    let menu;
    try {
      menu = entry.resolve();
    } catch (error) {
      logger.error({ at: "ContextActionKeys - edit", error });
      return;
    }
    const action = flattenContextActions(menu, {
      hasActionHandler: Boolean(entry.onAction)
    }).find((item) => item.item.value === ResourceActionType.EDIT);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    void runContextAction(action, {
      runCommand: (command) => requireCommandHost().runAction(command),
      onAction: entry.onAction
    });
  }
</script>

<svelte:window onkeydown={onKeydown} onkeydowncapture={onEditShortcut} />
