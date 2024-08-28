<script lang="ts">
  import { type IActiveNodeStore } from "../../node.store";
  import { resolveIframability } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  export let node: IActiveNodeStore;
  let isLoading: boolean = true;
  let isIframeEnabled: boolean = false;
  let isIframable: boolean = false;
  let isHovering: boolean = false;
  onMount(async () => {
    if (!$node.body?.url) return;
    isIframable = await resolveIframability($node.body.url);
    isLoading = false;
    console.log({ isIframable });
  });
</script>

<HoverableElement
  class="relative w-full h-full flex justify-center items-center"
  bind:isHovering
>
  {#if isLoading}
    <div class="text-center text-b3 text-fgs3">Loading...</div>
  {:else if isIframable && isIframeEnabled}
    <iframe
      src={$node.body.url}
      class="w-full h-full"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    />
  {:else if $node.metadata?.ogImage || $node.metadata?.screenshotUrl}
    <img
      src={isValidString($node.metadata.ogImage)
        ? $node.metadata.ogImage
        : $node.metadata.screenshotUrl}
      alt="Preview not available"
      class="w-full h-full object-contain rounded--md"
    />
  {:else}
    <div class="text-center text-b3 text-fgs3">
      No preview available for this page. Please use the link below to view the
      page.
    </div>
  {/if}
  {#if isIframeEnabled}
    <div
      class="absolute top-0 right-0 mx-4 my-2 flex gap-2 items-center justify-center"
    >
      <Button
        icon="cross"
        size={Size.md}
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        on:click={() => {
          isIframeEnabled = !isIframeEnabled;
        }}
      />
    </div>
  {/if}
  {#if isIframable && isHovering && !isIframeEnabled}
    <div class="absolute m-2 flex gap-2 items-center justify-center">
      <Button
        icon="play"
        size={Size.md}
        label="Preview"
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.DEFAULT}
        on:click={() => {
          isIframeEnabled = !isIframeEnabled;
        }}
      />
    </div>
  {/if}
</HoverableElement>
