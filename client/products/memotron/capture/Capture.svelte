<script lang="ts">
  import Writer from "./Writer.svelte";
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import AppLoadingView from "$lib/client/layout/paint/AppLoadingView.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Linkbox from "../common/linkbox/Linkbox.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import TypeSelector from "./TypeSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import PropertiesListView from "../collection/properties/PropertiesListView.svelte";
  import NodeAvatar from "../node/nodeAvatar/NodeAvatar.svelte";
  import { LinkType } from "$lib/client/products/memotron/node/node.type";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  refresh();
  const visibilityChangeListener = async (event: Event) => {
    if (document?.hidden) return;
    refresh();
  };
  let isSaving: boolean = false;
  let isEmptyState: boolean = true;
  isInEditMode.set(true);
  let isPropertiesCollapsed: boolean = false;
  function refresh() {
    dataManager.refresh(Resource.capture);
  }
  $: types = $captureStore.links
    ?.filter(
      (x) =>
        x.toType === MemotronResourceType.TYPED_COLLECTION &&
        x.linkType === LinkType.DIRECT &&
        x.from === "root"
    )
    ?.map((x) => x.to);
  $: console.log({ types, links: $captureStore.links });
</script>

{#if isSaving}
  <div></div>
  <AppLoadingView message="Saving..." />
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
{:else}
  {#key $captureStore.refreshId}
    <div class="w-full h-full flex justify-center">
      <div class="w-full max-w-5xl h-full flex flex-col p-4 bg-bgs1">
        <header class="flex justify-between w-full dp:px-14">
          <div class="flex gap--4 grow">
            <!-- TODO - if nodularized and type is added to a heading node, then replace "root" with the heading node id -->
            <NodeAvatar {types} />
            <div class="text-h4 font-medium w-full">
              <TextInput
                bind:value={$captureStore.label}
                style={InputStyle.PLAIN}
                isExperimentalMdInput={true}
                placeholder="Title"
              />
            </div>
          </div>
          <div class="flex gap-1">
            <!-- save, cancel, edit type actions
            TODO: save icon
           -->
            {#if !isEmptyState}
              <Button
                label="save"
                type={ButtonVariant.PRIMARY}
                size={Size.sm}
                icon="bookmark"
                on:click={async () => {
                  isSaving = true;
                  const result = await captureStore.save();
                  isSaving = false;
                }}
              />
              <Button
                label="clear"
                style={ButtonStyle.OUTLINED}
                size={Size.sm}
                icon="cross"
                on:click={() => {
                  captureStore.reset();
                  isEmptyState = true;
                }}
              />
            {/if}
          </div>
        </header>
        <main class="flex flex-col gap-6 w-full flex-grow">
          {#key types?.length}
            {#if types && types.length > 0}
              <!-- TODO - send only selected type if properties are to be shown upon link click -->
              <PropertiesListView
                context="capture"
                bind:properties={$captureStore.properties}
                {types}
                bind:isCollapsed={isPropertiesCollapsed}
              />
            {/if}
          {/key}
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
                on:select={(e) => {
                  isEmptyState = false;
                  captureStore.onTypeSelect(e.detail);
                }}
              />
            </div>
          {/if}
        </main>
        {#if !isEmptyState}
          <footer class="w-full dp:px-10 min-h-[10rem]">
            <Linkbox />
          </footer>
        {/if}
      </div>
    </div>
  {/key}
{/if}
<svelte:document on:visibilitychange={visibilityChangeListener} />
