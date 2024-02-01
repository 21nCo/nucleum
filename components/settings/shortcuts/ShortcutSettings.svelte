<script lang="ts">
  import InlineErrorMessage from "$lib/tidy/elements/text/InlineErrorMessage.svelte";
  import { appStore, userPreferences } from "$lib/tidy/stores/app.store";
  import type { KeyboardShortcut } from "$lib/tidy/types/preferences.type";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
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
</div>
