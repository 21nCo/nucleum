<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let isInThinMode: boolean = false;
  export let isRounded: boolean = false;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  $: isCpActive =
    $page.params.route?.includes("/cp") || $page.route.id?.includes("/cp");
</script>

<div
  class={cn("w-full bg-bgs3", {
    "h-28": isInThinMode && size === Size.lg,
    "h-24": isInThinMode && size === Size.md,
    "h-12": !isInThinMode
  })}
>
  {#if $appStore.appData?.leftPanelFooter === "simple" || !$appStore.appData?.leftPanelFooter}
    <div
      class={cn("w-full h-full flex justify-between items-center", {
        "flex-col": isInThinMode
      })}
    >
      <button
        class={cn(
          "flex gap-2 h-full w-full items-center justify-center px-2 hover:bg-bgs4",
          {
            "rounded-bl-lg": !isInThinMode && isRounded,
            "bg-aps1": isCpActive
          }
        )}
        on:click={() => appStore.runAction(Action.SETTINGS)}
      >
        <Icon icon="ph:gear-six-light" isAccentBgContext={isCpActive} {size} />
      </button>
      <button
        class={cn(
          "flex h-full w-full justify-center px-2 items-center gap-1 hover:bg-bgs4",
          {
            "rounded-b-lg": isInThinMode,
            "rounded-br-lg": !isInThinMode
          }
        )}
        on:click={() => {
          appStore.runAction(Action.HELP);
        }}
      >
        <Icon icon="ph:question-light" {size} />
        {#if !isInThinMode}
          <span class="text-b3 text-fgs2">Help</span>
        {/if}
      </button>
    </div>
  {:else}
    <!-- else content here -->
  {/if}
</div>
