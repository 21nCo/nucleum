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
  import { parse } from "$lib/shared/utils/json.utils";
  import context from "$lib/client/stores/context.store";

  export let node: IWebPage;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  let isCheckingIframability: boolean = true;
  let isIframeShown: boolean = false;
  let isIframeable: boolean = false;
  let isHovering: boolean = false;
  let customMessage: string | undefined = undefined;

  onMount(async () => {
    await initialize();
  });

  async function initialize() {
    try {
      const data = resolveCustomSettings(node.url);
      customMessage = data.customMessage;
      isIframeable = data.isIframeable || false;
      if (isIframeable) {
        isIframeShown = true;
        isCheckingIframability = false;
      }
      if (!customMessage && !isIframeable) {
        const result = await resolveIframability(node.url, {
          isUseCloud: $account.dataMode === UserDataMode.CLOUD
        });
        isIframeable = result;
        if (
          isIframeable &&
          accessPoint === ResourceAccessPoint.MARKDOWN_EMBED
        ) {
          isIframeShown = true;
        }
        isCheckingIframability = false;
      }
    } catch (e) {
      console.error(e);
      isCheckingIframability = false;
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
      const urlData = await new Persistence().retrieveUrlData(url, {
        isReturnRawData: true
      });
      if (isValidString(urlData?.headers)) {
        const headers = parse(urlData.headers);
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
      if (headers["content-security-policy"]) {
        const cspVal = headers["content-security-policy"];
        if (cspVal.includes("frame-ancestors")) return false;
      }
      return true;
    }
  }

  function resolveCustomSettings(url: string) {
    const urlData = resolveUrlData(url);
    return {
      customMessage: urlData?.customMessage,
      isIframeable: urlData?.isIframeable
    };
  }
</script>

<HoverableElement
  class="relative w-full h-full flex justify-center items-center"
  bind:isHovering
>
  {#if customMessage}
    <div class="text-center text-b3 text-fgs3">{customMessage}</div>
  {:else if accessPoint === ResourceAccessPoint.MARKDOWN_EMBED && isCheckingIframability}
    <div class="text-center text-b3 text-fgs3">Loading preview...</div>
  {:else if accessPoint === ResourceAccessPoint.MARKDOWN_EMBED && !isIframeable}
    <div class="text-center text-b3 text-fgs3">Preview not available</div>
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
      src={node.metadata?.ogImage || ""}
      class="w-full h-full object-contain rounded--md"
    />
  {:else if node.metadata?.screenshotFile}
    <FileView id={node.metadata.screenshotFile} />
  {:else}
    <div class="text-center text-b3 text-fgs3">
      {#if !isIframeable}
        No preview available for this page. Please use the link below to view
        the page.
      {:else}
        Preview
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
        tooltip="Close preview"
        on:click={() => {
          isIframeShown = !isIframeShown;
        }}
      />
    </div>
  {/if}
  {#if isIframeable && (isHovering || $context.isTouchDevice) && !isIframeShown}
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
