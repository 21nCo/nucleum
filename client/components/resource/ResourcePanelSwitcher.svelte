<script lang="ts">
  import BoxSwitcher from "@21n/elements/switcher/BoxSwitcher.svelte";
  import BoxButton from "@21n/elements/button/BoxButton.svelte";
  import { slide } from "svelte/transition";
  import { cn } from "@21n/utils/ui.utils";
  import type { IToggleItem } from "@21n/elements/toggle/toggle.type";
  import type { Readable } from "svelte/store";
  import {
    ResourceAccessMode,
    type IResourcePageWithPanels
  } from "@21n/components/flux/resourceStores/resource.type";
  import { Size } from "@21n/types/size.enum";
  import { ButtonVariant } from "@21n/types/button.type";
  import { appStore } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import ContextMenuAction from "@21n/elements/contextMenu/ContextMenuAction.svelte";
  import type { IContextMenuItem } from "@21n/types/select.type";

  export let resourceStore: Readable<IResourcePageWithPanels>;
  export let panels: IToggleItem[];
  export let isConstrainedWidth: boolean = false;
  export let accessMode: ResourceAccessMode;
  export let contextMenuResolver: () =>
    | {
        group: string;
        items: IContextMenuItem[];
      }[]
    | undefined = undefined;
</script>

<div
  class={cn("absolute bottom-0 inset-x-0 mx-auto w-fit z-10", {
    "mb-3": $resourceStore.isInFocusMode
  })}
>
  <div
    class={cn(
      "flex cw:flex-row-reverse border-t border-x border-brs3 shadow-md  overflow-hidden",
      {
        "h-8 bg-bgs3 rounded-md": $resourceStore.isInFocusMode,
        "h-14 bg-bgs2 rounded-t-md": !$resourceStore.isInFocusMode
      }
    )}
  >
    {#if $resourceStore.isInFocusMode}
      <div class="flex h-full" in:slide={{ duration: 300, axis: "x" }}>
        <BoxButton
          icon="cross"
          label="Close"
          width="px-2"
          parentBgIndex={3}
          on:click={() => {
            $resourceStore.switchPanel("DEFAULT");
          }}
        />
      </div>
    {:else}
      <div class="flex cw:border-l border-r border-brs2">
        {#if contextMenuResolver !== undefined}
          <div class="flex items-center h-full">
            <ContextMenuAction
              menuResolver={contextMenuResolver}
              size={Size.lg}
              isBoxed={true}
              parentBgIndex={1}
              class="h-full w-10"
              id="resourcePanelContextMenu"
              icon="more-outline-horizontal"
              heading="Actions"
              on:action
            />
          </div>
        {/if}
      </div>
      <div class="pb-2">
        <BoxSwitcher
          isExpandOnActiveForIcon={true}
          options={panels}
          size={$view.isConstrainedWidth ? Size.sm : Size.md}
          isActiveIndicatorOnTop={true}
          selected={$resourceStore.panel}
          on:select={(e) => $resourceStore.switchPanel(e.detail)}
          isIconOnlyMode={$view.isConstrainedWidth}
        />
      </div>
      <div class="cw:border-r border-l border-brs2">
        {#if isConstrainedWidth}
          <BoxButton
            icon="chevron-left"
            tooltip="Go back"
            width="px-3"
            parentBgIndex={2}
            on:click={() => {
              if (accessMode === ResourceAccessMode.FULL) {
                appStore.toggleFullScreen(accessMode, $resourceStore.id);
              } else {
                appStore.goBack();
              }
            }}
          />
        {:else}
          <BoxButton
            icon="cross"
            tooltip="Close"
            width="px-3"
            parentBgIndex={2}
            type={ButtonVariant.DANGER}
            on:click={() => {
              appStore.closeResource({ id: $resourceStore.id });
            }}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>
