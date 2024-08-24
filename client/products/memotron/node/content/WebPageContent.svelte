<script lang="ts">
  import { type IActiveNodeStore } from "../node.store";
  import { resolveIframability } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  export let node: IActiveNodeStore;
  let isLoading: boolean = true;
  let isIframeEnabled: boolean = false;
  let isIframable: boolean = false;
  onMount(async () => {
    if (!$node.body?.url) return;
    isIframable = await resolveIframability($node.body.url);
    isLoading = false;
    console.log({ isIframable });
  });
</script>

<div class="flex gap-6 w-full h-full">
  <main class="relative h-full w-3/5 2k:w-1/2">
    {#if isLoading}
      <div class="w-full h-full flex justify-center items-center">
        <div class="text-center text-b3 text-fgs3">Loading...</div>
      </div>
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
        class="w-full h-full object-contain rounded--md border-r border-brs3"
      />
    {:else}
      <div class="w-full h-full flex justify-center items-center">
        <div class="text-center text-b3 text-fgs3">
          No preview available for this page. Please use the link below to view
          the page.
        </div>
      </div>
    {/if}
    <div class="absolute bottom-0 left-0 m-2 flex gap-2 items-center">
      <Button
        icon="arrow-up-right"
        label={$node.body.url?.split("?")[0]}
        size={Size.xs}
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        on:click={() => {
          appStore.openLink($node.body.url);
        }}
      />
    </div>
  </main>
  <aside class="flex flex-col gap-4 justify-center items-center flex-1">
    <!-- <Button
      icon="arrow-up-right"
      label="Open link"
      size={Size.sm}
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.OUTLINED}
      on:click={() => {
        appStore.openLink($node.body.url);
      }}
    /> -->
    {#if isIframable}
      <Button
        icon="play"
        size={Size.sm}
        label={isIframeEnabled ? "Close preview" : "Preview"}
        style={ButtonStyle.OUTLINED}
        on:click={() => {
          isIframeEnabled = !isIframeEnabled;
        }}
      />
    {/if}
    <!-- <div>
      <button
        class="flex gap-2 items-center rounded-full border border-brs3 px-4 py-2 hover:bg-bgs2"
      >
        <Icon icon="bookmark" />
        <span> Highlights </span>
        <span
          class="bg-bgs2 border border-brs2 w-4 h-4 rounded-md text-b4 text-fgs3"
        >
          {$node.clips?.length}
        </span>
      </button>
    </div> -->
    <!-- <div class="text-b3 text-fgs3 mt-2">
      Clipped at {formatDatetime($userPreferences, $node.createdAt)}
    </div> -->
  </aside>
</div>
