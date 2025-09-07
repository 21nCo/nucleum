<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { resolveResourceIcon } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessMode,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Writer from "../capture/Writer.svelte";
  import { CaptureMethod } from "../capture/capture.type";
  import {
    ActiveCaptureStore,
    type IActiveCaptureStore
  } from "../capture/capture.store";
  import { generateResourceId } from "$lib/client/components/flux/flux.utils";
  import HomeTopNav from "./mobile/HomeTopNav.svelte";
  import { haptic } from "$lib/client/utils/embed.utils";
  import TypeSelectorOnMobile from "../capture/typeSelector/TypeSelectorOnMobile.svelte";
  import { fly } from "svelte/transition";
  import HomeQuickAccess from "$lib/client/components/home/mobile/HomeQuickAccess.svelte";
  import type { IQuickAccessItem } from "$lib/client/components/home/home.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import CaptureTopBar from "../capture/CaptureTopBar.svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import {
    AlertType,
    type InlineToast
  } from "$lib/client/types/notification.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { inlineToasts } from "$lib/client/stores/notification.store";
  import NotificationListener from "$lib/client/elements/listeners/NotificationListener.svelte";
  import InlineSyncingFeedback from "$lib/client/elements/feedback/InlineSyncingFeedback.svelte";
  import FileUploader from "../capture/FileUploader.svelte";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import ComponentEmbedLayer from "$lib/client/layout/layers/ComponentEmbedLayer.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { quintOut } from "svelte/easing";
  import ResourceSearchBase from "../library/search/ResourceSearchBase.svelte";
  import account from "$lib/client/stores/account.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { resolveProductConfig } from "../../product.config";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  export let captureId: IRecordId = generateResourceId(Resource.capture);
  let mode: "search" | "capture" | undefined = undefined;
  let searchQuery = "";
  let captureStore: IActiveCaptureStore;
  let writerRef: Writer | null = null;
  const isBoxedLayout = true;
  let inlineToast: InlineToast | null = null;
  const dev_isExpandableCaptureSection = false;
  let dev_iosCameraCaptureMethod: "input" | "swift-relay" = "input";
  let cameraCaptureRef: HTMLInputElement;
  const transitionDuration = 250;
  initializeCaptureStore();
  const searchStore = new SearchStore();
  let searchBaseRef: ResourceSearchBase;
  let resource: Resource = Resource.everything;
  const homePathPt = resolveProductConfig().homePathPt;

  function initializeCaptureStore() {
    captureId = generateResourceId(Resource.capture);
    captureStore = ActiveCaptureStore.resolve(captureId);
  }

  async function loadQuickAccessData(): Promise<IQuickAccessItem[]> {
    let nodeCounts: number | undefined = undefined;
    let collectionCounts: number | undefined = undefined;
    try {
      const [nodes, collections] = await Promise.all([
        searchStore.resolveCount({ resource: Resource.node }),
        searchStore.resolveCount({ resource: Resource.collection })
      ]);
      nodeCounts = nodes;
      collectionCounts = collections;
    } catch (error) {
      console.error("Failed to load counts:", error);
    }
    return [
      {
        id: "nodes",
        label: "Nodes",
        icon: resolveResourceIcon(Resource.node),
        count: nodeCounts
      },
      {
        id: "collections",
        label: "Collections",
        icon: resolveResourceIcon(Resource.collection),
        count: collectionCounts
      },
      {
        id: "calendar",
        label: "Calendar",
        icon: "calendar"
      }
    ];
  }

  const commonActionParams = {
    searchParams: {
      [AppSearchParam.RETURN_TO]: homePathPt
    }
  };

  function handleSettingsClick() {
    haptic();
    appStore.runAction(Action.SETTINGS, commonActionParams);
    mode = undefined;
  }

  function handleQuickAccessClick(item: IQuickAccessItem) {
    haptic();
    if (item.id === "calendar") {
      appStore.runAction(Action.CALENDAR, commonActionParams);
    } else {
      appStore.runAction(ResourceActionType.BROWSE, {
        componentParams: {
          resource: item.id === "nodes" ? Resource.node : Resource.collection,
          [AppSearchParam.RETURN_TO]: homePathPt
        }
      });
    }
  }

  async function onTypeSelect(e: CustomEvent) {
    haptic("capture");
    if (
      e.detail === CaptureMethod.CAMERA &&
      $context.isEmbed &&
      $context.os === OperatingSystem.IOS &&
      dev_iosCameraCaptureMethod === "input"
    ) {
      triggerNativeCameraCaptureUsingInputAPI();
    } else if (e.detail !== CaptureMethod.UPLOAD) {
      mode = "capture";
    }
    await captureStore.onTypeSelect(e.detail);

    function triggerNativeCameraCaptureUsingInputAPI() {
      setTimeout(() => {
        cameraCaptureRef?.click();
      }, 10);
    }
  }

  function onCameraCancel(e: Event) {
    logger.log({ at: "Capture.svelte - onCameraCancel", e });
    if (e.type === "cancel") {
      onClear();
    }
  }

  function onCaptureDraftSelect(event: CustomEvent) {
    const draft = event.detail;
    captureStore = ActiveCaptureStore.resolve(draft.id);
    captureStore.load(draft);
    setModeToCapture();
  }

  function onClear() {
    reset();
  }

  async function onSave() {
    await captureStore.save();
    reset();
  }

  function reset() {
    mode = undefined;
    captureStore.reset();
    initializeCaptureStore();
  }

  function onInlineToastEvent(event: CustomEvent<InlineToast>) {
    haptic("success");
    inlineToast = event.detail;
  }

  function onInlineToastClose() {
    if (inlineToast) {
      inlineToasts.remove(inlineToast.id);
      inlineToast = null;
    }
  }

  function onInlineToastAction() {
    if (inlineToast?.data) {
      appStore.openResource(inlineToast.data.id, ResourceAccessMode.POP);
    }
    onInlineToastClose();
  }

  async function handleCapture(e: Event) {
    await captureStore.handleCapture(e);
    reset();
  }

  function focusWriter() {
    if (writerRef) {
      writerRef.focus();
    }
  }
  function setModeToCapture() {
    mode = "capture";
    haptic("capture");
  }
</script>

{#if $captureStore.isSaving}
  <EmptyStatusView
    isLoadingState={true}
    loadingText="Saving..."
    isFullPage={true}
  />
{:else}
  <div class="flex flex-col w-full bg-bgs2 pt-12">
    <div
      class={cn("transition-all duration-250 ease-out overflow-hidden", {
        "max-h-96 opacity-100": !mode,
        "max-h-0 opacity-0": mode
      })}
    >
      {#if !mode}
        <HomeTopNav {transitionDuration} on:settings={handleSettingsClick} />
      {/if}
      {#if !mode}
        <div class="px-4">
          <InlineSyncingFeedback resource={Resource.everything} />
        </div>
      {/if}
    </div>
    {#if mode === "capture"}
      <div
        class="flex items-center p-4"
        in:fly={{
          y: -20,
          duration: transitionDuration,
          easing: quintOut
        }}
      >
        <CaptureTopBar
          {captureStore}
          isHomeContext={true}
          on:focusBody={() => {
            writerRef?.focus();
          }}
          on:clear={onClear}
          on:save={onSave}
        />
      </div>
    {/if}

    {#if !mode || mode === "search"}
      <div
        class={cn("flex flex-col w-full", {
          "h-full": mode === "search"
        })}
      >
        <ResourceSearchBase
          bind:this={searchBaseRef}
          bind:resource
          isExpanded={mode === "search"}
          parentBgIndex={2}
          on:close={() => {
            mode = undefined;
            searchQuery = "";
          }}
        >
          <div
            class={cn("flex items-center gap-2  pt-3 pb-3", {
              "px-4": mode !== "search",
              "pl-4": mode === "search"
            })}
          >
            <TextInput
              bind:value={searchQuery}
              placeholder={resource === Resource.everything
                ? "Search across your memory..."
                : "Search " + resource + "s"}
              on:focus={() => {
                mode = "search";
                setTimeout(() => {
                  searchBaseRef?.search();
                }, 100);
              }}
              on:keydown={(e) => {
                searchBaseRef?.keydown(e.detail.event);
              }}
              on:keyup={(e) => {
                searchBaseRef?.keyup(e.detail.event);
              }}
            />
          </div>
        </ResourceSearchBase>
      </div>
    {/if}
    {#if !mode}
      {#await loadQuickAccessData()}
        <!-- promise is pending -->
      {:then items}
        <div
          class="flex-shrink-0"
          transition:fly={{
            y: -30,
            duration: transitionDuration,
            easing: quintOut
          }}
        >
          <HomeQuickAccess
            {items}
            on:itemClick={(e) => handleQuickAccessClick(e.detail)}
          />
        </div>
      {:catch error}
        <!-- promise was rejected -->
      {/await}
    {/if}
    {#if inlineToast}
      {@const isError = inlineToast.type === AlertType.ERROR}
      <div
        class="px-3 pt-4"
        transition:fly={{
          y: -10,
          duration: transitionDuration,
          easing: quintOut
        }}
      >
        <div
          class="border border-dashed border-brs3 rounded-md py-2 pl-3 pr-1 flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <Icon
              icon={isError ? "x-circle" : "check-circle"}
              size={Size.sm}
              class={isError ? "text-ars1" : "text-ags1"}
              isFilled={!isError}
            />
            <span
              class={cn("text-b2", {
                "text-fgs2": !isError,
                "text-ars1": isError
              })}
            >
              {inlineToast.message}
            </span>
          </div>
          <div class="flex items-center gap-2">
            {#if !isError}
              <Button
                label="View"
                size={Size.sm}
                isPreventMinWidth={true}
                type={ButtonVariant.PRIMARY}
                on:click={onInlineToastAction}
              />
            {/if}
            <Button icon="cross" on:click={onInlineToastClose} />
          </div>
        </div>
      </div>
    {/if}
    {#if mode !== "search"}
      <div
        class={cn("flex-1 min-h-0 overflow-y-auto", {
          "mt-4": mode === undefined,
          "bg-bgs1 border-t border-brs2": isBoxedLayout,
          "rounded-t-[32px]": dev_isExpandableCaptureSection
        })}
      >
        <div class="flex-1 flex flex-col justify-between h-full w-full pt-3">
          <div class="flex flex-col justify-start px-4 w-full h-full">
            <div
              class={cn(
                "w-full flex items-start bg-bgs1 text-left mb-4 relative",
                {
                  "p-4 rounded-lg": !isBoxedLayout,
                  "min-h-32 grow": mode === undefined,
                  "h-full": mode === "capture"
                }
              )}
            >
              <!-- Double entry here to avoid keyboard adjustment issues on iOS Webview -->
              <button
                class={cn("absolute w-full h-full", {
                  "z-50": mode === undefined,
                  "-z-10": mode === "capture"
                })}
                on:click={() => {
                  focusWriter();
                }}
              >
                <button
                  class="w-full h-full"
                  on:click={() => {
                    if (!mode) setModeToCapture();
                  }}
                />
              </button>
              {#if $captureStore.method === CaptureMethod.CAMERA && dev_iosCameraCaptureMethod === "input" && $context.isEmbed && $context.os === OperatingSystem.IOS}
                <!-- <CameraCaptureUsingInput {captureStore} /> -->
                <input
                  bind:this={cameraCaptureRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  on:change={handleCapture}
                  on:cancel={onCameraCancel}
                  id="cameraInput"
                  class="hidden"
                />
              {:else if $captureStore.method === CaptureMethod.UPLOAD && !($context.isEmbed && $context.os === OperatingSystem.IOS)}
                <FileUploader {captureStore} on:cancel={onClear} />
              {:else}
                {#key $captureStore.refreshId}
                  <Writer
                    bind:this={writerRef}
                    {captureStore}
                    on:change={(e) => {
                      captureStore.onMdContentChanges(e);
                    }}
                    on:clear={onClear}
                    on:saved={reset}
                  />
                {/key}
              {/if}
            </div>
            {#if mode === undefined && $account.dataMode !== UserDataMode.LOCAL && $context.isInOfflineMode}
              <div class="py-1.5">
                <InlineInfoBanner
                  type={InfoTextType.WARNING}
                  size={Size.sm}
                  content="File uploads are not supported yet when offline."
                />
              </div>
            {/if}
          </div>
          {#if !mode}
            <TypeSelectorOnMobile
              selected={$captureStore.method}
              on:capture={(e) => {
                handleCapture(e.detail);
              }}
              on:draftSelect={onCaptureDraftSelect}
              on:select={onTypeSelect}
              on:cancel={onClear}
            />
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<NotificationListener
  event={[GlobalEvent.INLINE_TOAST]}
  inlineToastId="nodecapture"
  on:inlinetoast={onInlineToastEvent}
/>
<ComponentEmbedLayer bg={2} />
