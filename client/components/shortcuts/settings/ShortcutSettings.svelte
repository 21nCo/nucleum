<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import { appStore } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import { Action } from "@21n/types/action.enum";
  import { Embed } from "@21n/types/context.type";
  import { keyboardShortcuts } from "@21n/components/shortcuts/shortcuts.store";
  import ShortcutItem from "@21n/components/shortcuts/settings/ShortcutItem.svelte";
  let error: string | undefined = undefined;
  let keyMap = keyboardShortcuts.fetchConfiguratbleShortcuts();
</script>

<div class="flex flex-col gap-4 w-full">
  {#if $context.embed === Embed.HANDSET || $context.embed === Embed.TABLET}
    <InlineInfoBanner
      content="We are sorry. Configuring shortcuts is not currently available on mobile or tablet. Please use desktop or web app to configure your shortcuts."
    />
  {:else}
    {#each keyMap as shortcut}
      <ShortcutItem
        action={shortcut.action}
        {shortcut}
        on:error={(e) => {
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
      on:click={() => {
        appStore.runAction(Action.HOT_KEYS);
      }}
    />
    <Button
      icon="markdown"
      label="See markdown shortcuts"
      on:click={() => {
        appStore.runAction(Action.MARKDOWN_SHORTCUTS);
      }}
    />
  </div>
</div>
