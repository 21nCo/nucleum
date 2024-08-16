<script lang="ts">
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { keyboardShortcuts } from "../../shortcuts/shortcuts.store";
  import ShortcutItem from "./ShortcutItem.svelte";
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
</div>
