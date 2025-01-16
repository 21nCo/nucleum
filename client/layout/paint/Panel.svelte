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
  import Icon from "$lib/client/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let title: string | undefined = undefined;
  export let titleStyle: TextStyle = TextStyle.PAGE_HEADING_SUBTLE;
  export let floatingButton: IButtonParams | undefined = undefined;
  export let panelSize: Size.sm | Size.md | Size.lg = Size.md;
  export let isNavActivated: boolean = false;
  export let isShowBackButton: boolean = false;

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
      {#if !isNavActivated && (title || isShowCollapseButton)}
        <button
          class={cn(
            "flex justify-between items-center w-full px-4 pt-2 overflow-auto min-h-fit mo:min-h-14"
          )}
          on:click={() => {
            if (isShowBackButton) dispatch("back");
          }}
        >
          <div
            class={cn("flex items-center gap-2", {
              "hover:bg-bgs2 rounded-md px-1": isShowBackButton
            })}
          >
            {#if isShowBackButton}
              <Icon icon="ph:caret-left" class="text-fgs3 opacity-40" />
            {/if}
            <Text style={titleStyle} content={title || ""} />
          </div>
          <slot name="toprightactions">
            {#if isShowCollapseButton}
              <div class="flex items-center">
                <Button
                  icon="ph:caret-left-light"
                  tooltip="Collapse panel"
                  on:click={() => (isCollapsed = true)}
                />
              </div>
            {/if}
          </slot>
        </button>
      {/if}
      {#if $$slots.nonpadded}
        <slot name="nonpadded" />
      {:else if isNavActivated && $$slots.nav}
        <!-- TODO - overlay nav on top and add gesture to go back instead / or use safari webview existing gesture for browser back navigation -->
        <slot name="nav" />
      {:else}
        <div class="px-4 flex-grow">
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
