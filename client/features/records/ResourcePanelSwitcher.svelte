<script lang="ts">
  import { elementControlShape as shape } from "@21n/ui/environment/control-shape";
  import BoxSwitcher from "@21n/ui/elements/switcher/BoxSwitcher.svelte";
  import BoxButton from "@21n/ui/elements/button/BoxButton.svelte";
  import { fly, slide } from "svelte/transition";
  import { cn } from "@21n/ui/environment/presentation";
  import type { IToggleItem } from "@21n/ui/elements/toggle/toggle.type";
  import type { Readable } from "svelte/store";
  import {
    AccessMode,
    type IResourcePageWithPanels
  } from "@nucleum/datafn/resource.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { ButtonVariant } from "@21n/ui/elements/button/button.type";
  import { requireResourcePanelHost } from "@nucleum/shared-state/resources/resource-panel-host";
  import view from "@21n/ui/environment/view.store";
  import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
  import type { IContextMenuItem } from "@21n/ui/elements/contextMenu/context-menu.type";
  import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import {
    isInPlaceResource,
    resolveInPlaceResourceClose
  } from "@nucleum/shared-state/resources/in-place-resource";
  import EditModeDone from "@21n/ui/elements/button/EditModeDoneButton.svelte";
  import { finishEditMode } from "@nucleum/shared-state/resources/edit-mode-finish";

  interface Props {
    resourceStore: Readable<IResourcePageWithPanels>;
    panels: IToggleItem[];
    isConstrainedWidth?: boolean;
    accessMode?: AccessMode;
    onAction?: ((detail: IContextMenuItem["value"]) => void) | undefined;
    /** Hides the floating bar, such as while the content scrolls down. */
    isFloatingHidden?: boolean;
    /**
     * `floating` renders the bar at the bottom of the resource, `tabs` renders
     * only the view tabs and actions for the top bar, and `edit-bar` renders
     * only the close-edit-mode bar that stays at the bottom.
     */
    variant?: "floating" | "tabs" | "edit-bar";
    /**
     * Width the top bar can give the `tabs` variant; view tabs that do not
     * fit move into a More menu.
     */
    entryWidth?: number | undefined;
    contextMenuResolver?:
      | (() =>
          | {
              group: string;
              items: IContextMenuItem[];
            }[]
          | undefined)
      | undefined;
  }

  let {
    resourceStore,
    panels,
    isConstrainedWidth = false,
    accessMode,
    onAction = undefined,
    isFloatingHidden = false,
    variant = "floating",
    entryWidth = undefined,
    contextMenuResolver = undefined
  }: Props = $props();
  const isInPlace = isInPlaceResource();
  const closeInPlace = resolveInPlaceResourceClose();

  let editModeWidth = $state(0);
  /** The record Actions button's width as last shown. */
  let measuredTrailingWidth = $state(0);
  /**
   * The width the switcher reserves for the record Actions button. The button
   * is not rendered while it sits in More, so its last shown width stands in
   * for it; it is 0 when there is no Actions menu.
   */
  let trailingWidth = $state(0);
  /** Whether the record Actions button sits in the view tabs' More menu. */
  let isActionsInMore = $state(false);
  const TRAILING_GAP_PX = 8;
  const EDIT_MODE_GAP_PX = 12;
  const hasActionsMenu = $derived(contextMenuResolver !== undefined);
  $effect(() => {
    if (!hasActionsMenu) trailingWidth = 0;
    else if (measuredTrailingWidth > 0) trailingWidth = measuredTrailingWidth;
  });
  /**
   * Width the view tabs and, when there is an Actions button, the button
   * with the gap before it can take. The switcher moves the button into its
   * More menu when even its smallest form does not fit beside it.
   */
  const tabsWidth = $derived(
    entryWidth === undefined
      ? undefined
      : Math.max(
          0,
          entryWidth -
            ($resourceStore.isInEditMode
              ? editModeWidth + EDIT_MODE_GAP_PX
              : 0) -
            (hasActionsMenu ? 0 : TRAILING_GAP_PX)
        )
  );

  function resolveContextMenu() {
    return contextMenuResolver?.() ?? [];
  }

  function handleContextMenuAction(event: CustomEvent<any>) {
    onAction?.(event.detail);
  }

  /**
   * The More menu entry that stands for the Actions button: a submenu with
   * the same record actions, hints and callbacks, which reports the picked
   * action the way the button does.
   */
  const actionsMoreItem: IContextMenuItem = {
    value: "record-actions",
    label: "Actions",
    icon: "more-outline-horizontal",
    secondStepComponent: {
      isFocusedOnKeyboardOpen: true,
      component: ContextMenu,
      props: {
        menuResolver: resolveContextMenu,
        heading: "Actions",
        size: Size.lg
      }
    },
    callback: async (item?: IContextMenuItem) => {
      if (item) onAction?.(item.value);
    }
  };
  const tabsTrailing = $derived(
    variant === "tabs" && hasActionsMenu && trailingWidth > 0
      ? { width: trailingWidth + TRAILING_GAP_PX, menuItem: actionsMoreItem }
      : undefined
  );
</script>

{#snippet panelSwitcher(
  size: Size.sm | Size.md,
  isIconOnlyMode: boolean,
  isTrackFilled?: boolean,
  isIndicatorOnTop?: boolean
)}
  <BoxSwitcher
    isTablist={true}
    isExpandOnActiveForIcon={true}
    options={panels}
    {size}
    isAccentColor={true}
    isActiveIndicatorOnTop={isIndicatorOnTop ?? false}
    {isTrackFilled}
    selected={$resourceStore.panel}
    onSelect={(e) => $resourceStore.switchPanel(e.detail)}
    {isIconOnlyMode}
    isOverflowToMenu={variant === "tabs"}
    overflowWidth={variant === "tabs" ? tabsWidth : undefined}
    overflowTrailing={tabsTrailing}
    bind:isTrailingInMenu={isActionsInMore}
  />
{/snippet}

{#snippet actionsMenu(parentBgIndex: number)}
  {#if contextMenuResolver !== undefined}
    <div class="flex items-center h-full">
      <ContextMenuAction
        testId="resource-record-context-menu"
        menuResolver={resolveContextMenu}
        size={Size.lg}
        isBoxed={true}
        {parentBgIndex}
        class="h-full w-10 app-framed:h-10 app-framed:rounded-[var(--app-control-radius)]"
        id="resourcePanelContextMenu"
        icon="more-outline-horizontal"
        heading="Actions"
        onAction={handleContextMenuAction}
      />
    </div>
  {/if}
{/snippet}

{#snippet closeEditModeButton(className: string)}
  <button
    class={className}
    onclick={() =>
      finishEditMode($resourceStore.id.toString(), () =>
        $resourceStore.closeEditMode()
      )}
  >
    <Icon icon="cross" size={Size.sm} class="text-abg" />
    <span> Close edit mode </span>
  </button>
{/snippet}

{#snippet viewTabs()}
  <div
    class="flex items-center h-full min-w-0"
    data-testid="resource-context-tabs"
  >
    {#if $resourceStore.isInEditMode}
      <div
        class="flex items-center h-full pr-3 mr-3 border-r border-brs3 app-framed:border-transparent"
        bind:offsetWidth={editModeWidth}
      >
        <EditModeDone
          onDone={() =>
            finishEditMode($resourceStore.id.toString(), () =>
              $resourceStore.closeEditMode()
            )}
        />
      </div>
    {/if}
    {#if $resourceStore.isInFocusMode}
      <BoxButton
        icon="cross"
        label="Exit focus mode"
        width="px-3"
        parentBgIndex={2}
        onclick={() => {
          $resourceStore.switchPanel();
        }}
      />
    {:else}
      {@render panelSwitcher(Size.md, $shape.isFramed && isConstrainedWidth)}
      <div
        class={cn("flex items-center h-full ml-2 shrink-0", {
          hidden: isActionsInMore
        })}
        bind:offsetWidth={measuredTrailingWidth}
      >
        {#if !isActionsInMore}
          {@render actionsMenu(1)}
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#if variant === "tabs"}
  {@render viewTabs()}
{:else if variant === "edit-bar"}
  {#if $resourceStore.isInEditMode}
    <div class="absolute bottom-0 inset-x-0 mx-auto w-fit z-10">
      {@render closeEditModeButton(
        "flex gap-1 px-6 h-11 min-h-11 bg-ass1 text-abg items-center justify-center rounded-t-md hover:brightness-110"
      )}
    </div>
  {/if}
{:else if !isFloatingHidden}
  <div class="absolute bottom-0 inset-x-0 mx-auto w-fit z-10">
    <div
      class={cn(
        "flex flex-col border- border-t border-x border-brs2 border-t--bgs1 shadow-sm rounded-t-md overflow-hidden app-framed:rounded-t-[var(--app-panel-radius)]"
      )}
    >
      <div
        class={cn("flex cw:flex-row-reverse  overflow-hidden", {
          "h-8 bg-bgs3": $resourceStore.isInFocusMode,
          "h-[50px] bg-bgs2 app-framed:h-12 app-framed:px-1":
            !$resourceStore.isInFocusMode,
          "rounded--md": !$resourceStore.isInEditMode,
          "rounded-t--md": $resourceStore.isInEditMode
        })}
      >
        {#if $resourceStore.isInFocusMode}
          <div
            class="flex h-full border-t border-brs2 app-framed:border-transparent app-framed:items-center"
            in:slide={{ duration: 300, axis: "x" }}
          >
            <BoxButton
              icon="cross"
              label="Close"
              width="px-2"
              parentBgIndex={3}
              onclick={() => {
                $resourceStore.switchPanel();
              }}
            />
          </div>
        {:else}
          {#if !isInPlace || closeInPlace}
            <div
              class="flex cw:border-l border-r border--t border-brs2 text-fgs2 mr-3 app-framed:border-transparent app-framed:items-center"
            >
              <BoxButton
                label="Close"
                icon="cross"
                width="px-3"
                size={Size.sm}
                type={ButtonVariant.DANGER}
                parentBgIndex={2}
                onclick={() => {
                  if (closeInPlace) closeInPlace();
                  else requireResourcePanelHost().close($resourceStore.id);
                }}
              />
            </div>
          {/if}
          {@render panelSwitcher(
            $view.isConstrainedWidth ? Size.sm : Size.md,
            $view.isConstrainedWidth,
            false,
            !$shape.isFramed
          )}
          <div
            class="flex items-center h-full cw:border-r border-l border-brs2 ml-3 app-framed:border-transparent app-framed:gap-1 app-framed:pr-1"
          >
            {#if isConstrainedWidth && !isInPlace}
              <BoxButton
                icon="chevron-left"
                tooltip="Go back"
                width="px-3"
                parentBgIndex={2}
                onclick={() => {
                  requireResourcePanelHost().goBack();
                }}
              />
            {:else}
              <div
                class="flex items-center bg--bgs3 border--t border-brs2 h-full"
              >
                {@render actionsMenu(1)}
              </div>
            {/if}
          </div>
        {/if}
      </div>
      {#if $resourceStore.isInEditMode}
        {@render closeEditModeButton(
          "flex gap-1 w-full h-11 min-h-11 bg-ass1 text-abg items-center justify-center rounded-b-md hover:brightness-110"
        )}
      {/if}
    </div>
  </div>
{/if}
