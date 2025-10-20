<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "@21n/elements/Icon.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Action } from "@21n/types/action.enum";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  export let isInThinMode: boolean = false;
  export let isRounded: boolean = false;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let dev_mixedPanel: boolean = false;
  $: isCpActive =
    $page.params.route?.includes("/cp") || $page.route.id?.includes("/cp");
</script>

<div
  class={cn("w-full", {
    "h-16": isInThinMode && size === Size.lg,
    "h-24": isInThinMode && size === Size.md,
    "h-12": !isInThinMode,
    "bg-bgs3": !dev_mixedPanel || !$appStore.currentComponent?.panel
  })}
>
  {#if $appStore.appData?.leftPanelFooter === "simple" || !$appStore.appData?.leftPanelFooter}
    <div
      class={cn("w-full h-full flex justify-between items-center", {
        "flex-col": isInThinMode
      })}
    >
      <button
        class={cn("flex gap-2 h-full w-full items-center justify-center px-2", {
          "rounded-bl-lg": !isInThinMode && isRounded,
          "bg-aps1": isCpActive,
          "hover:bg-bgs4":
            !dev_mixedPanel || !$appStore.currentComponent?.panel,
          "hover:bg-bgs3 rounded-tr-lg":
            dev_mixedPanel && $appStore.currentComponent?.panel
        })}
        on:click={() => appStore.runAction(Action.SETTINGS)}
      >
        <Icon icon="gear" isAccentBgContext={isCpActive} {size} />
      </button>
      <!-- <button
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
        <Icon icon="question" {size} />
        {#if !isInThinMode}
          <span class="text-b3 text-fgs2">Help</span>
        {/if}
      </button> -->
    </div>
  {:else}
    <!-- else content here -->
  {/if}
</div>
