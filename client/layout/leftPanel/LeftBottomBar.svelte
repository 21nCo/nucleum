<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let isInThinMode: boolean = false;
  export let isRounded: boolean = false;
  //let isCpActive: boolean = false;
  $: isCpActive =
    $page.params.route?.includes("/cp") || $page.route.id?.includes("/cp");
  // onMount(() => {
  //   windowObject.subscribe((x) => {
  //     console.log({ x });
  //     isCpActive = x?.currentPath?.includes("/cp");
  //   });
  // });
</script>

<div
  class={cn("w-full bg-bgs3", {
    "h-24": isInThinMode,
    "h-12": !isInThinMode
  })}
>
  {#if $appStore.appData?.leftPanelFooter === "simple" || !$appStore.appData?.leftPanelFooter}
    <div
      class="w-full h-full flex {isInThinMode
        ? 'flex-col items-center'
        : 'flex-row'} justify-between items-center"
    >
      <button
        class="flex gap-2 h-full w-full items-center justify-center px-2 {!isInThinMode &&
        isRounded
          ? 'rounded-bl-lg'
          : ''} {isCpActive ? 'bg-aps1' : ''}"
        on:click={() => appStore.runAction(Action.SETTINGS)}
      >
        <Icon icon="ph:gear-six-light" isAccentBgContext={isCpActive} />
      </button>
      <button
        class="flex h-full w-full justify-center px-2 items-center gap-1 {isInThinMode
          ? 'rounded-b-lg'
          : 'rounded-br-lg'}"
        on:click={() => {
          // openLink($appStore?.appData?.urls?.help);
          appStore.runAction(Action.HELP);
        }}
      >
        <Icon icon="ph:question-light" />
        {#if !isInThinMode}
          <span class="text-b3 text-fgs2">Help</span>
        {/if}
      </button>
    </div>
  {:else}
    <!-- else content here -->
  {/if}
</div>
