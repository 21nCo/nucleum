<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import BoxButton from "@21n/ui/elements/button/BoxButton.svelte";

  import { Action } from "@nucleum/client/config/action.enum";
</script>

<div class="w-full flex flex-col" data-testid="left-bottom-bar">
  <div class="flex items-center justify-center w-full h-12">
    <BoxButton
      icon="settings"
      tooltip="Settings"
      testId="app-menu-settings"
      parentBgIndex={2}
      onclick={(event) => {
        event.stopPropagation();
        requireCommandHost().runAction(Action.SETTINGS);
      }}
    />
  </div>
  <div class="flex items-center justify-center w-full h-12">
    <BoxButton
      icon="question"
      tooltip="Help"
      testId="app-menu-help"
      parentBgIndex={2}
      onclick={(event) => {
        event.stopPropagation();
        requireCommandHost().runAction(Action.HELP);
      }}
    />
  </div>
</div>
