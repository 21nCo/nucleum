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
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import PropertiesListView from "../collection/properties/PropertiesListView.svelte";
  import NodeAvatar from "../node/avatar/NodeAvatar.svelte";
  import { LinkType } from "$lib/client/products/memotron/node/node.type";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import type { IProperty } from "../collection/properties/property.type";
  import { collectionStore } from "../collection/collection.store";
  import { CaptureType } from "./capture.type";
  import FileUploader from "./FileUploader.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { onDestroy, onMount } from "svelte";
  import { page } from "$app/stores";
  import { logger } from "$lib/client/components/debug/logger.client";
  import type { IRecordId } from "$lib/client/types/data.type";
  export let isWindowDnD = false;
  let bulkQueryParam: string | null = null;
  let linkQueryParam: string | null = null;

  let isSaving: boolean = false;
  let isEmptyState: boolean = true;
  isInEditMode.set(true);
  let isPropertiesCollapsed: boolean = false;
  let types: IRecordId[] = [];
  let avatars: IAvatar[] = [];
  let propertyConfig: IProperty[] = [];

  // $: console.log({ types, $captureStore, propertyConfig });

  async function refreshTypeData() {
    types =
      $captureStore.links
        ?.filter(
          (x) =>
            x.toType === MemotronResourceType.TYPED_COLLECTION &&
            x.linkType === LinkType.DIRECT &&
            x.from === "root"
        )
        ?.map((x) => x.to) ?? [];
    if (types.length === 0) return;
    const data = await collectionStore.resolveTypes(types);
    avatars = data.avatars;
    propertyConfig = data.propertyConfig;
  }

  onMount(() => {
    linkQueryParam = $page.url.searchParams.get("link");
    bulkQueryParam = $page.url.searchParams.get("bulk");
    const clipBoardQueryParam = $page.url.searchParams.get("clipboard");
    logger.log({
      at: "Capture.svelte",
      linkQueryParam,
      bulkQueryParam,
      clipBoardQueryParam
    });
    if (linkQueryParam) {
      captureStore.directLink({ id: linkQueryParam });
      isEmptyState = false;
    }
  });

  onDestroy(() => {
    appStore.toggleSearchParam(["link", "bulk", "clipboard"]);
  });

  async function onTypeSelect(e: CustomEvent) {
    isEmptyState = false;
    await captureStore.onTypeSelect(e.detail);
    await refreshTypeData();
  }
</script>

{#if isSaving}
  <EmptyStatusView isLoadingState={true} />
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
  <FileUploader />
{:else}
  {#key $captureStore.refreshId}
    <div class="w-full h-full flex justify-center">
      <div class="w-full max-w-5xl h-full flex flex-col p-4 bg-bgs1">
        <header class="flex justify-between w-full dp:px-12">
          <div class="flex gap--4 grow">
            <!-- TODO - if nodularized and type is added to a heading node, then replace "root" with the heading node id -->
            <NodeAvatar {avatars} />
            <div class="text-h2 font-medium w-full">
              <TextInput
                bind:value={$captureStore.label}
                style={InputStyle.PLAIN}
                isExperimentalMdInput={true}
                placeholder="Untitled"
              />
            </div>
          </div>
          <div class="flex gap-1">
            <!-- save, cancel, edit type actions
            TODO: save icon
            "hugeicons:arrow-move-up-right"
           -->
            {#if !isEmptyState}
              <Button
                label="save"
                type={ButtonVariant.PRIMARY}
                size={Size.sm}
                isPreventMinWidth={true}
                icon="ph:floppy-disk"
                on:click={async () => {
                  isSaving = true;
                  const result = await captureStore.save();
                  if (bulkQueryParam === "true" && linkQueryParam) {
                    captureStore.directLink({ id: linkQueryParam });
                    isEmptyState = false;
                  }
                  isSaving = false;
                }}
              />
              <Button
                label="clear"
                style={ButtonStyle.OUTLINED}
                isPreventMinWidth={true}
                size={Size.sm}
                icon="ph:x-light"
                on:click={() => {
                  captureStore.reset();
                  isEmptyState = true;
                }}
              />
            {/if}
          </div>
        </header>
        <main class="flex flex-col gap-6 w-full flex-grow">
          {#if propertyConfig && propertyConfig.length > 0}
            <!-- TODO - send only selected type if properties are to be shown upon link click -->
            <PropertiesListView
              context="capture"
              {propertyConfig}
              bind:properties={$captureStore.properties}
              bind:isCollapsed={isPropertiesCollapsed}
            />
          {/if}
          <div
            class={cn("w-full", {
              "h-48": isEmptyState,
              "h-full": !isEmptyState
            })}
          >
            <Writer bind:isEmptyState />
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
          <footer class="w-full dp:px-10 min-h-[10rem]">
            <LinkboxOnCapture />
          </footer>
        {/if}
      </div>
    </div>
  {/key}
{/if}

<ComponentBaseLayer hasDragAndDrop={!isWindowDnD} />
