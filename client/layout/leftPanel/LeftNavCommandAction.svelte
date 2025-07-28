<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { Size } from "$lib/client/types/size.enum";
  export let isInThinMode = false;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
</script>

{#if $appStore?.appData?.isCmdBarEnabled === true}
  {#if isInThinMode}
    <Icon
      icon="terminal-window"
      {size}
      class="text-fgs2 hover:text-aps1"
      on:click={() => appStore.runAction(Action.CMD)}
    />
  {:else}
    <div class="text-b3 text-fgs3 mb-4">
      Press <button
        class="text-fgs2 px-1 py-[1px] rounded-md border border-brs3 hover:bg-bgs3"
        on:click={() => appStore.runAction(Action.CMD)}
      >
        <ShortcutText shortcut={Action.CMD} isPlainText={true} />
      </button> for cmd bar
    </div>
  {/if}
{/if}
