<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import LinkboxOnCapture from "../common/linkbox/LinkboxOnCapture.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { CaptureMethod, type ICaptureLink } from "./capture.type";
  import view from "$lib/client/stores/view.store";
  import Tag from "$lib/client/elements/text/Tag.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { KeyboardKey, ModifierKey } from "$lib/client/types/keyboard.type";
  import CaptureTitle from "./CaptureTitle.svelte";
  import type { IActiveCaptureStore } from "./capture.store";
  import { LinkType } from "../linking/link.type";
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  export let captureStore: IActiveCaptureStore;
  export let isHomeContext: boolean = $view.isConstrainedWidth;
  const dispatch = createEventDispatcher();
  async function onLink(e: CustomEvent) {
    if (e.detail.id && e.detail.type === CollectionType.TYPED) {
      $captureStore.expandedType = e.detail.id;
    } else {
      $captureStore.expandedType = null;
    }
  }

  function resolveDirectLinksCount(links: ICaptureLink[] | undefined) {
    const len = links?.filter(
      (x) => x.linkType === LinkType.DIRECT && x.from === "root"
    )?.length;
    if (len && len > 0) return len;
    return undefined;
  }
  function onSave() {
    dispatch("save");
  }
</script>

<div class="flex flex-col gap-4 dp:pb-4 items-center w-full">
  <header
    class={cn("flex justify-between gap-4 items-center w-full", {
      "px-12":
        !$view.isConstrainedWidth &&
        $captureStore.method === CaptureMethod.MARKDOWN
    })}
  >
    <div class="flex gap--4 grow">
      <!-- TODO - if nodularized and type is added to a heading node, then replace "root" with the heading node id -->
      <!-- <NodeAvatar {types} /> -->
      <!-- <div class="text-h3 font-medium w-full">
      <TextInput
        bind:value={$captureStore.label}
        style={InputStyle.PLAIN}
        id="capture-title"
        isExperimentalMdInput={true}
        placeholder="Title"
        isPreventDefaultOnEnter={true}
        on:change={refreshEmptyState}
        on:debouncedChange={persistLabel}
        on:enter={onTitleEnter}
        on:keydown={(e) => {
          const event = e.detail;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            writerRef?.focus();
          }
        }}
      />
    </div> -->
      <CaptureTitle {captureStore} {isHomeContext} on:focusBody />
    </div>
    <div class="flex cw:gap-2 gap-3 items-center h-full">
      {#if (!$captureStore.isEmpty && $captureStore.method === CaptureMethod.MARKDOWN) || isHomeContext}
        {#if isHomeContext}
          <Toggle
            icon="link"
            parentBgIndex={2}
            count={resolveDirectLinksCount($captureStore.links)}
            on={$captureStore.isLinksExpanded}
            bgSize={Size.md}
            on:change={() => {
              $captureStore.isLinksExpanded = !$captureStore.isLinksExpanded;
            }}
          />
        {:else}
          <Tag
            label="Links"
            icon="link"
            isActive={$captureStore.isLinksExpanded}
            count={resolveDirectLinksCount($captureStore.links)}
            isShowExpandFeedbackOnActive={true}
            isRemovable={false}
            on:click={() =>
              ($captureStore.isLinksExpanded = !$captureStore.isLinksExpanded)}
          />
          <div class="h-full py-2">
            <Divider
              orientation={Orientation.Vertical}
              colorStrength={ColorStrength.Strong}
            />
          </div>
        {/if}
        {#if $captureStore.method === CaptureMethod.MARKDOWN}
          <Button
            label={isHomeContext ? undefined : "Save"}
            type={ButtonVariant.PRIMARY}
            size={isHomeContext ? Size.md : Size.sm}
            style={ButtonStyle.OUTLINED}
            isPreventMinWidth={true}
            shortcut={{
              key: KeyboardKey.ENTER,
              modifiers: [ModifierKey.META]
            }}
            icon="save"
            on:click={onSave}
          />
          <Button
            label={isHomeContext ? undefined : "Clear"}
            style={ButtonStyle.OUTLINED}
            isPreventMinWidth={true}
            size={isHomeContext ? Size.md : Size.sm}
            icon="cross"
            on:click={() => {
              dispatch("clear");
            }}
          />
        {/if}
      {/if}
    </div>
  </header>

  {#if (isHomeContext && $captureStore.isLinksExpanded) || (!isHomeContext && ($captureStore.method !== CaptureMethod.MARKDOWN || ($captureStore.method === CaptureMethod.MARKDOWN && !$captureStore.isEmpty && $captureStore.isLinksExpanded)))}
    <div
      class={cn("w-full h-fit", {
        "dp:px-12": $captureStore.method === CaptureMethod.MARKDOWN
      })}
    >
      <LinkboxOnCapture
        {captureStore}
        on:linked={onLink}
        expand={$captureStore.expandedType}
      />
    </div>
  {/if}
  {#if $captureStore.isProcessingClipboard}
    <div
      class="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-transparent via-bgs2 to-transparent p-2"
    >
      <Icon
        icon="svg-spinners:3-dots-fade"
        size={Size.sm}
        class="stroke-fgs3"
      />
      <span class="text-fgs3"> Processing... </span>
    </div>
  {/if}
</div>
