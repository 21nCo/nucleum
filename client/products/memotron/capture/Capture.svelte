<script lang="ts">
  import Writer from "@21n/products/memotron/capture/Writer.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { appStore, isInEditMode } from "@21n/stores/app.store";
  import { cn } from "@21n/utils/ui.utils";
  import TypeSelector from "@21n/products/memotron/capture/TypeSelector.svelte";
  import { Size } from "@21n/types/size.enum";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { CaptureMethod } from "@21n/products/memotron/capture/capture.type";
  import FileUploader from "@21n/products/memotron/capture/FileUploader.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { onDestroy, onMount, setContext } from "svelte";
  import { page } from "$app/stores";
  import Icon from "@21n/elements/Icon.svelte";
  import view from "@21n/stores/view.store";
  import context from "@21n/stores/context.store";
  import { OperatingSystem } from "@21n/types/context.type";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { generateResourceId } from "@21n/components/flux/flux.utils";
  import { postMessageToParent } from "@21n/utils/embed.utils";
  import { EmbedMessage } from "@21n/types/embedMessage.enum";
  import { appEvents } from "@21n/stores/notification.store";
  import type { IEvent } from "@21n/types/event.type";
  import type { IRecordId } from "@21n/types/data.type";
  import {
    ActiveCaptureStore,
    type IActiveCaptureStore
  } from "@21n/products/memotron/capture/capture.store";
  import CaptureDraftsAction from "@21n/products/memotron/capture/draftSelector/CaptureDraftsAction.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { GlobalEvent } from "@21n/types/event.enum";
  import CaptureTopBar from "@21n/products/memotron/capture/CaptureTopBar.svelte";
  import { fly } from "svelte/transition";
  import { Placement } from "@21n/types/direction.enum";
  import ComponentShortcutListener from "@21n/components/shortcuts/ComponentShortcutListener.svelte";
  import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
  import { Action } from "@21n/types/action.enum";

  export let captureId: IRecordId = generateResourceId(Resource.capture);
  export let isWindowDnD = false;
  const captureContext = {
    id: captureId
  };

  setContext("capture", captureContext);
  let captureStore: IActiveCaptureStore;
  if (captureId) captureStore = ActiveCaptureStore.resolve(captureId);
  isInEditMode.set(true);
  let writerRef: Writer | undefined = undefined;
  let subs: any[] = [];
  let captureTopBarRef: CaptureTopBar | undefined = undefined;
  onMount(async () => {
    const appEventSub = appEvents.subscribe(async (x: IEvent) => {
      if (x.event === GlobalEvent.ENTER && x.value.metaKey === true) {
        await captureStore.save();
      }
    });
    subs.push(appEventSub);
    const captureType = isWindowDnD
      ? CaptureMethod.UPLOAD
      : CaptureMethod.MARKDOWN;
    if (captureType !== CaptureMethod.MARKDOWN && !isWindowDnD) {
      reset();
    }
    const linkQueryParam = $page.url.searchParams.get(AppSearchParam.LINK);
    const bulkQueryParam = $page.url.searchParams.get(AppSearchParam.BULK);
    const clipBoardQueryParam = $page.url.searchParams.get(
      AppSearchParam.CLIPBOARD
    );
    await captureStore.init({
      isWindowDnD,
      linkQueryParam,
      bulkQueryParam,
      clipBoardQueryParam,
      method: captureType
    });
  });

  /**
   * Note: a timeout is added to remove query params - since without timeout, it is interfering with removal of pop query param for capture thus the capture modal keeps opening
   */
  onDestroy(() => {
    subs.forEach((x) => x());
    setTimeout(() => {
      appStore.toggleSearchParam([
        AppSearchParam.LINK,
        AppSearchParam.BULK,
        AppSearchParam.CLIPBOARD
      ]);
    }, 100);
  });

  async function onTypeSelect(e: CustomEvent) {
    await captureStore.onTypeSelect(e.detail);
  }

  function reset() {
    captureStore.reset();
    if ($view.isConstrainedWidth) {
      appStore.closeResource({ accessMode: ResourceAccessMode.POP });
    }
    postMessageToParent(EmbedMessage.MENU_ITEM_SELECTED);
  }

  async function onSave() {
    await captureStore.save();
    reset();
  }
</script>

{#if $captureStore.isSaving && $captureStore.method !== CaptureMethod.UPLOAD}
  <EmptyStatusView isLoadingState={true} loadingText="Saving..." />
{:else}
  {#key $captureStore.refreshId}
    <div
      class="w-full h-full flex justify-center otop:pt-12"
      id={`mdcontainer-${$captureStore.id}`}
    >
      <div class="w-full max-w-5xl h-full flex flex-col p-4 bg-bgs1">
        {#if !$captureStore.isSaving}
          <CaptureTopBar
            bind:this={captureTopBarRef}
            {captureStore}
            on:focusBody={() => writerRef?.focus()}
            on:clear={reset}
            on:save={onSave}
          />
        {/if}
        <main class="flex flex-col gap-6 w-full flex-grow">
          <div
            class={cn("w-full", {
              "h-48 min-h-48": $captureStore.isEmpty,
              "h-full": !$captureStore.isEmpty
            })}
          >
            {#if $captureStore.method === CaptureMethod.UPLOAD && !($context.isEmbed && $context.os === OperatingSystem.IOS)}
              <FileUploader {captureStore} on:clear={reset} />
            {:else}
              <Writer
                {captureStore}
                bind:this={writerRef}
                on:change={(e) => {
                  captureStore.onMdContentChanges(e);
                }}
                on:clear={reset}
              />
            {/if}
          </div>
          {#if $captureStore.isEmpty}
            <div class="flex flex-col gap-8 w-full dp:px-12 dp:my-10">
              <TypeSelector
                selected={$captureStore.method}
                isHideTypeShortcuts={$captureStore.isCaptureFromCollectionPage}
                on:select={onTypeSelect}
                on:capture={(e) => {
                  captureStore.handleCapture(e.detail);
                }}
              />
              <CaptureDraftsAction
                on:select={(e) => {
                  captureId = e.detail.id;
                  captureStore = ActiveCaptureStore.resolve(captureId);
                  captureStore.load(e.detail);
                }}
              />
              {#if $view.isConstrainedWidth}
                <ScrollViewBottomSpacer size={Size.sm} />
              {/if}
            </div>
          {/if}
        </main>

        {#if $view.isConstrainedWidth && ($captureStore.isEmpty || $captureStore.method === CaptureMethod.AUDIO)}
          <div
            class="w-full flex justify-center mb-5"
            in:fly={{ y: -100, duration: 250 }}
          >
            <button
              class="flex w-12 h-12 text-fgs3 hover:bg-bgs3 bg-bgs2 rounded-full items-center justify-center"
              on:click={reset}
            >
              <Icon icon="cross" />
            </button>
          </div>
        {/if}
        {#if !$view.isConstrainedWidth && ($captureStore.isEmpty || $captureStore.method === CaptureMethod.AUDIO)}
          <div class="w-full flex justify-center mb-5">
            <Button
              icon="cross"
              tooltip="Close capture"
              tooltipOptions={{ placement: Placement.TopCenter }}
              type={ButtonVariant.DANGER}
              shortcut={Action.CLOSE}
              on:click={() => {
                appStore.closeResource({ isRestrictToModals: true });
              }}
              style={ButtonStyle.OUTLINED}
              size={Size.lg}
            />
          </div>
        {/if}
      </div>
    </div>
  {/key}
{/if}

<ComponentBaseLayer hasDragAndDrop={!isWindowDnD} />
<ComponentShortcutListener
  isAllowFromTextInput={true}
  shortcuts={[
    {
      shortcut: MemotronAction.ACTIVATE_LINK_BOX,
      callback: () => {
        captureTopBarRef?.toggleLinkBox();
      }
    }
  ]}
/>
