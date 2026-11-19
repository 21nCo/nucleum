<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import Button from "@21n/ui/elements/button/Button.svelte";
  import InlineErrorMessage from "@21n/ui/elements/text/InlineErrorMessage.svelte";
  import InlineInfoBanner from "@21n/ui/elements/text/InlineInfoBanner.svelte";
  import SwitchInput from "@21n/ui/elements/toggle/SwitchInput.svelte";

  import context from "@nucleum/client/runtime/context.store";
  import { Action } from "@nucleum/client/config/action.enum";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
  import ShortcutItem from "@nucleum/surfaces/settings/shortcuts/ShortcutItem.svelte";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  let error: string | undefined = undefined;
  let keyMap = keyboardShortcuts.fetchConfiguratbleShortcuts();
</script>

<div class="flex flex-col gap-4 w-full" data-testid="keyboard-shortcut-settings">
  {#if $context.embed === Embed.HANDSET || $context.embed === Embed.TABLET}
    <InlineInfoBanner
      content="We are sorry. Configuring shortcuts is not currently available on mobile or tablet. Please use desktop or web app to configure your shortcuts."
    />
  {:else}
    <div data-testid="toggle-single-key-shortcuts">
      <SwitchInput
        checked={$userPreferences.isSingleKeyShortcutsEnabled !== false}
        onChange={(e) => {
          void userPreferences.setSingleKeyShortcutsEnabled(e.detail);
        }}
        label={{
          label: "Single-key shortcuts",
          tooltip: {
            body: "When on, keys pressed without Cmd, Ctrl or Option run shortcuts, such as letters on an open page, N, /, [, ?, Space, 1 to 9 and G chords. Turn it off if you use speech input or press keys by accident; shortcuts with Cmd, Ctrl or Option keep working."
          }
        }}
        isExpanded={true}
      />
    </div>
    {#each keyMap as shortcut}
      <ShortcutItem
        action={shortcut.action}
        {shortcut}
        onError={(e) => {
          console.log({ e });
          error = e.detail;
        }}
      />
    {/each}
    {#if error}
      <InlineErrorMessage bind:error />
    {/if}
  {/if}
  <div class="flex items-center gap-2">
    <Button
      icon="keyboard"
      label="See hot keys"
      onclick={() => {
        requireCommandHost().runAction(Action.HOT_KEYS);
      }}
    />
    <Button
      icon="markdown"
      label="See markdown shortcuts"
      onclick={() => {
        requireCommandHost().runAction(Action.MARKDOWN_SHORTCUTS);
      }}
    />
  </div>
</div>
