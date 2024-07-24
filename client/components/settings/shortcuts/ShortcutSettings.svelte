<script lang="ts">
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import type { KeyboardShortcut } from "$lib/client/types/preferences.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import ShortcutItem from "./ShortcutItem.svelte";
  let defaultKeyMap = $appStore?.appData?.shortcuts;
  let userKeyMap = $userPreferences?.shortcuts;
  let keyMap = defaultKeyMap;
  let error: string | undefined = undefined;
  if (defaultKeyMap && userKeyMap) {
    keyMap = defaultKeyMap.filter(
      (x: KeyboardShortcut) =>
        !userKeyMap?.some((y: KeyboardShortcut) => y.action === x.action)
    );
    keyMap = [...keyMap, ...userKeyMap];
  }
</script>

<div class="flex flex-col gap-4 max-w-lg">
  {#if $context.embed === Embed.HANDSET || $context.embed === Embed.TABLET}
    <InlineInfoBanner
      content="We are sorry. Configuring shortcuts is not currently available on mobile or tablet. Please use desktop or web app to configure your shortcuts."
    />
  {:else}
    {#if isValidArrayWithData(keyMap)}
      {#each keyMap as shortcut}
        <ShortcutItem
          {shortcut}
          on:error={(e) => {
            console.log({ e });
            error = e.detail;
          }}
        />
      {/each}
    {/if}
    {#if error}
      <InlineErrorMessage bind:error />
    {/if}
  {/if}
</div>
