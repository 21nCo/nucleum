<script lang="ts">
  import Divider from "$lib/client/elements/Divider.svelte";
  import FloatingButton from "$lib/client/elements/button/FloatingButton.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import view from "$lib/client/stores/view.store";
  import type { IButtonParams } from "$lib/client/types/button.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { onMount } from "svelte";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { Display } from "$lib/client/types/view.type";
  export let title: string | undefined = undefined;
  export let titleStyle: TextStyle = TextStyle.PAGE_HEADING_SUBTLE;
  export let floatingButton: IButtonParams | undefined = undefined;
  export let panelSize: Size.sm | Size.md | Size.lg = Size.md;

  onMount(() => {
    const unsubscribe = appEvents.subscribe((e) => {
      if (e.event === GlobalEvent.APP_MENU_SWITCHED) {
        isCollapsed = false;
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  let isCollapsed = false;

  $: isShowCollapseButton =
    $view.display !== Display.TK && !$view.isConstrainedWidth;
</script>

<div class="flex w-full h-full">
  {#if !isCollapsed}
    <div
      class={cn(
        "relative flex flex-col h-full",
        {
          "w-full": $view.isConstrainedWidth
        },
        !$view.isConstrainedWidth && {
          "w-[20rem] min-w-[20rem]": panelSize === Size.sm,
          "w-[24rem] min-w-[24rem] 2k:w-[28rem] 2k:min-w-[28rem]":
            panelSize === Size.md,
          "w-[28rem] min-w-[28rem]": panelSize === Size.lg
        }
      )}
    >
      {#if title || isShowCollapseButton}
        <div
          class={cn(
            "flex justify-between w-full portrait:px-4 portrait:py-2 px-3 pt-2 overflow-auto min-h-fit mo:min-h-14"
          )}
        >
          <Text style={titleStyle} content={title || ""} />
          <slot name="toprightactions">
            {#if isShowCollapseButton}
              <Button icon="cross" on:click={() => (isCollapsed = true)} />
            {/if}
          </slot>
        </div>
      {/if}
      {#if $$slots.nonpadded}
        <slot name="nonpadded" />
      {:else}
        <div class="px-4 flex-1 overflow-auto">
          <slot />
        </div>
      {/if}
      {#if floatingButton}
        <FloatingButton params={floatingButton} />
      {/if}
    </div>
  {/if}
  {#if !$view.isConstrainedWidth}
    <!-- Right split -->
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Normal}
    />
    <div class="relative flex flex-grow h-full">
      <slot name="right" />
    </div>
  {/if}
</div>
