<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import LinkboxOnCapture from "@21n/products/memotron/common/linkbox/LinkboxOnCapture.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import { CaptureMethod, type ICaptureLink } from "@21n/products/memotron/capture/capture.type";
  import view from "@21n/stores/view.store";
  import Tag from "@21n/elements/text/Tag.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import Divider from "@21n/elements/Divider.svelte";
  import { ColorStrength } from "@21n/types/appearance.type";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { KeyboardKey, ModifierKey } from "@21n/types/keyboard.type";
  import CaptureTitle from "@21n/products/memotron/capture/CaptureTitle.svelte";
  import type { IActiveCaptureStore } from "@21n/products/memotron/capture/capture.store";
  import { LinkType } from "@21n/products/memotron/linking/link.type";
  import { CollectionType } from "@21n/components/collection/collection.type";
  import { createEventDispatcher, tick } from "svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { haptic } from "@21n/utils/embed.utils";
  import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
  const dispatch = createEventDispatcher();
  export let captureStore: IActiveCaptureStore;
  export let isHomeContext: boolean = $view.isConstrainedWidth;
  let linkBoxRef: LinkboxOnCapture;

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
    haptic();
    dispatch("save");
  }

  export async function toggleLinkBox() {
    toggleLinkExpansion();
    if (!$captureStore.isLinksExpanded) return;
    await tick();
    linkBoxRef?.focus();
  }

  function toggleLinkExpansion() {
    haptic();
    $captureStore.isLinksExpanded = !$captureStore.isLinksExpanded;
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
            on:change={toggleLinkExpansion}
            shortcut={MemotronAction.ACTIVATE_LINK_BOX}
          />
        {:else}
          <Tag
            label="Links"
            icon="link"
            isActive={$captureStore.isLinksExpanded}
            count={resolveDirectLinksCount($captureStore.links)}
            isShowExpandFeedbackOnActive={true}
            isRemovable={false}
            on:click={toggleLinkExpansion}
            shortcut={MemotronAction.ACTIVATE_LINK_BOX}
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
            testId="capture-save-button"
            ariaLabel="Save"
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
              haptic();
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
        bind:this={linkBoxRef}
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
