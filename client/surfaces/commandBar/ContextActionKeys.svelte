<svelte:options runes={true} />

<script lang="ts">
  import { get } from "svelte/store";
  import {
    contextActions,
    type ContextActionsEntry
  } from "@nucleum/shell/topNav/contextZone/context-actions";
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
    isKeyTargetPane,
    isPlainPageKey
  } from "@nucleum/shell/shortcuts/page-keys";
  import { finishEditMode } from "@nucleum/shared-state/resources/edit-mode-finish";
  import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { logger } from "@nucleum/client/runtime/logging/logger";

  /** Whether an entry still holds the letters of the pane the user works in. */
  function isActiveTarget(entry: ContextActionsEntry) {
    return (
      get(contextActions.active)?.key === entry.key &&
      isKeyTargetPane(entry.pane)
    );
  }

  /**
   * Runs the open resource's menu item whose single key was pressed, such as
   * S to star, for the pane the user worked in last. Keys are ignored while
   * typing, with a modifier held, or with a modal, dialog or popover in front.
   * A failed action or save is logged, so the next press runs again, and a
   * failed confirmed action keeps its confirmation open to retry. Edit
   * runs after the open editor saves, and only if the resource still holds
   * the letters then.
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
    const value = action.item.value;
    const report = (error: unknown) =>
      logger.error({ at: "ContextActionKeys", action: value, error });
    const run = () =>
      runContextAction(action, {
        runCommand: (command) => requireCommandHost().runAction(command),
        onAction: entry.onAction
      }).then(
        () => true,
        (error: unknown) => {
          report(error);
          return false;
        }
      );
    if (CONFIRMED_RESOURCE_ACTIONS.has(String(value))) {
      confirmationNotification.notify({
        title: `${action.label} this ${entry.resource}`,
        message: `Move this ${entry.resource} to trash? You can restore it from Trash.`,
        confirmAction: {
          label: action.label,
          variant: ButtonVariant.DANGER,
          callback: run
        }
      });
      return;
    }
    if (value === ResourceActionType.EDIT) {
      finishEditMode(entry.id, () => {
        if (isActiveTarget(entry)) void run();
      }).catch(report);
      return;
    }
    void run();
  }
</script>

<svelte:window onkeydown={onKeydown} />
