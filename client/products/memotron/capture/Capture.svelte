<script lang="ts">
  import Writer from "./Writer.svelte";
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import LinkboxOnCapture from "../common/linkbox/LinkboxOnCapture.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import TypeSelector from "./TypeSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import PropertiesListView from "../collection/properties/PropertiesListView.svelte";
  import NodeAvatar from "../node/avatar/NodeAvatar.svelte";
  import { LinkType } from "$lib/client/products/memotron/node/node.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { collectionStore } from "../collection/collection.store";
  import { CaptureType } from "./capture.type";
  import FileUploader from "./FileUploader.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { onDestroy, onMount } from "svelte";
  import { page } from "$app/stores";
  import { logger } from "$lib/client/components/debug/logger.client";
  import {
    CollectionType,
    type ICollectionExpanded
  } from "../collection/collection.type";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import { isEmptyMd } from "$lib/client/components/markdown/markdown.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";

  export let isWindowDnD = false;
  let bulkQueryParam: string | null = null;
  let linkQueryParam: string | null = null;

  let isSaving: boolean = false;
  let isEmptyState: boolean = true;
  isInEditMode.set(true);
  let isPropertiesCollapsed: boolean = false;
  let writerRef: Writer | undefined = undefined;
  let types: ICollectionExpanded[] = [];
  let cameraCaptureRef: HTMLInputElement;
  // $: console.log({ types, $captureStore, propertyConfig });

  async function refreshTypeData() {
    const typeIds =
      $captureStore.links
        ?.filter(
          (x) =>
            x.toSubType === CollectionType.TYPED &&
            x.linkType === LinkType.DIRECT &&
            x.from === "root"
        )
        ?.map((x) => x.to) ?? [];
    if (typeIds.length === 0) {
      types = [];
      return;
    }
    types = await collectionStore.resolveTypes(typeIds);
  }

  onMount(async () => {
    if ($captureStore.captureType !== CaptureType.MARKDOWN && !isWindowDnD) {
      reset();
    }
    linkQueryParam = $page.url.searchParams.get("link");
    bulkQueryParam = $page.url.searchParams.get("bulk");
    const clipBoardQueryParam = $page.url.searchParams.get("clipboard");
    logger.log({
      at: "Capture.svelte - mount",
      linkQueryParam,
      bulkQueryParam,
      clipBoardQueryParam
    });
    if (linkQueryParam) {
      await setTypeFromLinkParam(linkQueryParam);
    } else {
      refreshEmptyState();
    }
  });

  /**
   * Note: a timeout is added to remove query params - since without timeout, it is interfering with removal of pop query param for capture thus the capture modal keeps opening
   */
  onDestroy(() => {
    setTimeout(() => {
      appStore.toggleSearchParam(["link", "bulk", "clipboard"]);
    }, 100);
  });

  async function onTypeSelect(e: CustomEvent) {
    if (
      e.detail === CaptureType.CAMERA &&
      $context.isEmbed &&
      $context.os === OperatingSystem.IOS
    ) {
      setTimeout(() => {
        cameraCaptureRef?.click();
      }, 10);
      return;
    }
    isEmptyState = false;
    await captureStore.onTypeSelect(e.detail);
    await refreshTypeData();
  }

  async function onLink(e: CustomEvent) {
    if (e.detail.id && e.detail.type === CollectionType.TYPED) {
      await refreshTypeData();
    }
  }
  async function onUnlink(e: CustomEvent) {
    if (e.detail && types.some(resourceInList(e.detail))) {
      await refreshTypeData();
    }
  }

  function refreshEmptyState(e?: CustomEvent) {
    if (
      isValidString($captureStore.label) ||
      $captureStore.captureType === CaptureType.AUDIO
    ) {
      isEmptyState = false;
      return;
    }
    if ("blocks" in $captureStore.body && !isEmptyMd($captureStore.body)) {
      isEmptyState = false;
      return;
    }
    isEmptyState = true;
  }

  async function propagatePropertyChanges(e: CustomEvent) {
    if (!e.detail || !e.detail?.id || e.detail?.value === undefined) return;
    captureStore.updateProperty({
      id: e.detail.id,
      value: e.detail.value
    });
  }

  function reset() {
    captureStore.reset();
    isEmptyState = true;
    types = [];
    if ($view.isConstrainedWidth) {
      appStore.closeResource({ accessMode: ResourceAccessMode.POP });
    }
  }

  async function setTypeFromLinkParam(linkQueryParam: string) {
    await captureStore.directLink(linkQueryParam);
    await refreshTypeData();
    isEmptyState = false;
  }

  function onTitleEnter(e: any) {
    writerRef?.focus();
    refreshEmptyState();
  }

  function handleCapture(event: Event) {
    try {
      isSaving = true;
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === "string") {
            fetch(result)
              .then((res) => res.blob())
              .then(async (blob) => {
                await captureStore.saveCameraCapture(blob);
                isSaving = false;
              });
          }
        };
        reader.readAsDataURL(file);
      } else {
        logger.log({ at: "Capture.svelte - handleCapture - no file present" });
        reset();
      }
    } catch (e) {
      logger.error({ at: "Capture.svelte - handleCapture", error: e });
      isSaving = false;
    }
  }

  function onCameraCancel(e: Event) {
    logger.log({ at: "Capture.svelte - onCameraCancel", e });
    if (e.type === "cancel") {
      reset();
    }
  }
</script>

{#if isSaving}
  <EmptyStatusView isLoadingState={true} loadingText="Saving..." />
  <!-- {:else if $view.isPortrait}
  <div class="w-full h-full flex flex-col">
    <div
      class={cn("w-full", {
        "h-full": isTypeResolved,
        "h-48": !isTypeResolved
      })}
    >
      <Writer />
    </div>
  </div> -->
{:else if $captureStore.captureType === CaptureType.UPLOAD}
  <FileUploader on:cancel={reset} />
{:else if $captureStore.captureType === CaptureType.CAMERA && $context.isEmbed && $context.os === OperatingSystem.IOS}
  <!-- <CameraCaptureUsingInput /> -->
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
{:else}
  {#key $captureStore.refreshId}
    <div class="w-full h-full flex justify-center">
      <div class="w-full max-w-5xl h-full flex flex-col p-4 bg-bgs1">
        {#if $captureStore.captureType !== CaptureType.AUDIO && $captureStore.captureType !== CaptureType.CAMERA}
          <header
            class="flex justify-between gap-4 items-center w-full lp:px-12"
          >
            <div class="flex gap--4 grow">
              <!-- TODO - if nodularized and type is added to a heading node, then replace "root" with the heading node id -->
              <!-- <NodeAvatar {types} /> -->
              <div class="text-h3 font-medium w-full">
                <TextInput
                  bind:value={$captureStore.label}
                  style={InputStyle.PLAIN}
                  isExperimentalMdInput={true}
                  placeholder="Untitled"
                  isPreventDefaultOnEnter={true}
                  on:change={refreshEmptyState}
                  on:enter={onTitleEnter}
                />
              </div>
            </div>
            <div class="flex gap-3 items-center">
              {#if !isEmptyState}
                <div class="flex items-center gap-1">
                  <Icon
                    icon={$captureStore.isRefreshing
                      ? "svg-spinners:90-ring-with-bg"
                      : "ph:check-circle-fill"}
                    size={Size.sm}
                    class="stroke-fgs3"
                  />
                  {#if !$view.isConstrainedWidth}
                    <span class="text-fgs3 whitespace-nowrap text-b3">
                      {$captureStore.isRefreshing ? "saving..." : "draft saved"}
                    </span>
                  {/if}
                </div>
                <Button
                  label={$view.isConstrainedWidth ? undefined : "Save"}
                  type={ButtonVariant.PRIMARY}
                  size={Size.sm}
                  style={ButtonStyle.OUTLINED}
                  isPreventMinWidth={true}
                  icon="ph:floppy-disk"
                  on:click={async () => {
                    isSaving = true;
                    const result = await captureStore.saveMarkdownCapture();
                    if (bulkQueryParam === "true" && linkQueryParam) {
                      await setTypeFromLinkParam(linkQueryParam);
                    } else {
                      types = [];
                      isEmptyState = true;
                    }
                    isSaving = false;
                  }}
                />
                <Button
                  label={$view.isConstrainedWidth ? undefined : "Clear"}
                  style={ButtonStyle.OUTLINED}
                  isPreventMinWidth={true}
                  size={Size.sm}
                  icon="ph:x-light"
                  on:click={reset}
                />
              {/if}
            </div>
          </header>
        {/if}
        <main class="flex flex-col gap-6 w-full flex-grow">
          {#if types && types.length > 0}
            <!-- TODO - send only selected type if properties are to be shown upon link click -->
            {#key types.map((x) => x.id).join(",")}
              <PropertiesListView
                context="capture"
                {types}
                values={$captureStore.properties}
                bind:isCollapsed={isPropertiesCollapsed}
                on:change={propagatePropertyChanges}
              />
            {/key}
          {/if}
          <div
            class={cn("w-full", {
              "h-48": isEmptyState,
              "h-full": !isEmptyState
            })}
          >
            <Writer
              bind:isEmptyState
              bind:this={writerRef}
              bind:isSaveInProgress={isSaving}
              on:change={refreshEmptyState}
              on:cancel={reset}
            />
          </div>
          {#if isEmptyState}
            <div class="w-full dp:px-10 dp:my-10">
              <TypeSelector
                bind:selected={$captureStore.captureType}
                label={{ label: "Select a type" }}
                isCapturePage={true}
                on:select={onTypeSelect}
              />
            </div>
          {/if}
        </main>
        {#if !isEmptyState}
          <footer class="w-full dp:px-10 mo:min-h-[8rem] min-h-[10rem]">
            <LinkboxOnCapture on:linked={onLink} on:unlinked={onUnlink} />
          </footer>
        {/if}
        {#if isEmptyState && $view.isConstrainedWidth}
          <div class="w-full flex justify-center mb-10">
            <Button icon="ph:x-light" label="Cancel" on:click={reset} />
          </div>
        {/if}
      </div>
    </div>
  {/key}
{/if}

<ComponentBaseLayer hasDragAndDrop={!isWindowDnD} />
