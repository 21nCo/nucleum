<script lang="ts">
  import Writer from "./Writer.svelte";
  import { captureStore } from "$lib/tidy/components/memotron/capture/capture.store";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/tidy/types/button.type";
  import { isInEditMode } from "$lib/tidy/stores/app.store";
  import AppLoadingView from "$lib/tidy/layout/paint/AppLoadingView.svelte";
  import TextInput from "$lib/tidy/elements/input/TextInput.svelte";
  import { TextInputStyle } from "$lib/tidy/types/textinput.enum";
  import Linkbox from "./Linkbox.svelte";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import TypeSelector from "./TypeSelector.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import { Item } from "$lib/tidy/types/item.enum";
  import Memocon from "../common/Memocon.svelte";
  import AvatarView from "$lib/tidy/elements/avatarPicker/AvatarView.svelte";
  import PropertiesListView from "../common/properties/PropertiesListView.svelte";
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
    dataManager.refresh(Item.capture);
  }
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
      <div class="w-full max-w-5xl h-full flex flex-col gap-6 p-4 bg-bgs1">
        <header class="flex justify-between w-full xl:px-10">
          <div class="flex gap-4 grow">
            {#if $captureStore.type?.avatar}
              <!-- TODO - AvatarPicker component - increasing loading time -->
              <!-- <Memocon bind:avatar={$captureStore.type.avatar} /> -->
              <AvatarView avatar={$captureStore.type.avatar} size={Size.md} />
            {/if}
            <div class="text-h4 font-medium w-full">
              <TextInput
                bind:value={$captureStore.label}
                style={TextInputStyle.PLAIN}
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
          <PropertiesListView
            bind:properties={$captureStore.properties}
            type={$captureStore.type}
            bind:isCollapsed={isPropertiesCollapsed}
          />
          <div
            class={cn("w-full", {
              "h-48": isEmptyState,
              "h-full": !isEmptyState
            })}
          >
            <Writer bind:isEmptyState />
          </div>
          {#if isEmptyState}
            <div class="w-full xl:px-10 xl:my-10">
              <TypeSelector
                on:select={(e) => {
                  isEmptyState = false;
                  captureStore.onTypeSelect(e.detail);
                }}
              />
            </div>
          {/if}
        </main>
        {#if !isEmptyState}
          <footer class="w-full xl:px-10 min-h-[10rem]">
            <Linkbox />
          </footer>
        {/if}
      </div>
    </div>
  {/key}
{/if}
<svelte:document on:visibilitychange={visibilityChangeListener} />
