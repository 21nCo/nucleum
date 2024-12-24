<script lang="ts">
  import { onMount } from "svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import type { IWebPage } from "../../node.type";
  import { UserDataMode } from "$lib/client/types/account.type";
  import account from "$lib/client/stores/account.store";
  import { Persistence } from "$lib/client/persistence/persistence";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import ImagePreview from "../ImagePreview.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { resolveUrlData } from "../../url.utils";

  export let node: IWebPage;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  let isLoading: boolean = true;
  let isIframeShown: boolean =
    accessPoint === ResourceAccessPoint.MARKDOWN_EMBED ||
    accessPoint === ResourceAccessPoint.SELF;
  let isIframeable: boolean = false;
  let isHovering: boolean = false;
  let customMessage: string | undefined = undefined;
  onMount(async () => {
    await initialize();
  });

  async function initialize() {
    try {
      customMessage = await resolveCustomMessage(node.url);
      if (customMessage) return;
      isIframeable = await resolveIframability(node.url, {
        isUseCloud: $account.dataMode === UserDataMode.CLOUD
      });
      isLoading = false;
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  async function resolveIframability(
    url: string,
    params?: { isUseCloud?: boolean }
  ): Promise<boolean> {
    if (!url) {
      throw new Error("URL is required");
    }
    const fromUrlMap = resolveUrlData(url);
    if (fromUrlMap?.isIframeable) {
      return true;
    }
    if (params?.isUseCloud) {
      const urlData = await new Persistence().retrieveUrlData(url);
      if (isValidString(urlData?.headers)) {
        const headers = JSON.parse(urlData.headers);
        console.log({ at: "resolveIframability", urlData, headers });
        if (!headers) return false;
        return resolveIframabilityFromHeaders(headers);
      }
    }
    return false;

    function resolveIframabilityFromHeaders(headers: Record<string, string>) {
      if (!headers) return false;
      if (headers["x-frame-options"]) {
        const xFrameVal = headers["x-frame-options"];
        if (xFrameVal === "SAMEORIGIN" || xFrameVal === "DENY") return false;
      }
      if (headers["frame-ancestors"]) {
        const frameAncestorsVal = headers["frame-ancestors"];
        if (frameAncestorsVal === "'none'") return false;
      }
      return true;
    }
  }

  async function resolveCustomMessage(url: string) {
    const urlData = resolveUrlData(url);
    return urlData?.customMessage;
  }
</script>

<HoverableElement
  class="relative w-full h-full flex justify-center items-center"
  bind:isHovering
>
  {#if isLoading}
    <div class="text-center text-b3 text-fgs3">Loading...</div>
  {:else if customMessage}
    <div class="text-center text-b3 text-fgs3">{customMessage}</div>
  {:else if isIframeable && isIframeShown}
    <iframe
      src={node.url}
      title="Web page preview"
      class="w-full h-full"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    />
  {:else if isValidString(node.metadata?.ogImage)}
    <ImagePreview
      src={node.metadata?.ogImage}
      class="w-full h-full object-contain rounded--md"
    />
  {:else if node.metadata?.screenshotFile}
    <FileView id={node.metadata.screenshotFile} />
  {:else}
    <div class="text-center text-b3 text-fgs3">
      {#if isIframeable}
        Click to preview site.
      {:else}
        No preview available for this page. Please use the link below to view
        the page.
      {/if}
    </div>
  {/if}
  {#if isIframeShown && isIframeable && accessPoint !== ResourceAccessPoint.MARKDOWN_EMBED}
    <div
      class="absolute top-0 right-0 mx-4 my-2 flex gap-2 items-center justify-center"
    >
      <Button
        icon="cross"
        size={Size.md}
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        on:click={() => {
          isIframeShown = !isIframeShown;
        }}
      />
    </div>
  {/if}
  {#if isIframeable && isHovering && !isIframeShown}
    <div class="absolute m-2 flex gap-2 items-center justify-center">
      <Button
        icon="play"
        size={Size.md}
        label="Preview"
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.DEFAULT}
        on:click={() => {
          isIframeShown = !isIframeShown;
        }}
      />
    </div>
  {/if}
</HoverableElement>
