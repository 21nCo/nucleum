<script lang="ts">
  import { onMount } from "svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { createEventDispatcher } from "svelte";
  import MastodonWidgetScript from "./MastodonWidgetScript.svelte";
  import { Persistence } from "$lib/client/persistence/persistence";
  import { parse } from "$lib/shared/utils/json.utils";
  import SocialPostLoadingInfo from "./SocialPostLoadingInfo.svelte";

  const dispatch = createEventDispatcher();

  export let postUrl: string;

  let id: string = generateSimpleRandomId();
  let embedHtml: string = "";
  let loading: boolean = true;
  let error: string = "";
  let isIframeable = false;
  let dev_isUseDirectAPIApproach = false;

  onMount(async () => {
    await loadMastodonEmbed();
  });

  async function loadMastodonEmbed() {
    try {
      loading = true;

      const instanceDomain = extractInstanceDomain(postUrl);
      if (!instanceDomain) {
        error = "Invalid Mastodon URL";
        loading = false;
        return;
      }

      await tryOEmbedApproach(instanceDomain);
      if (!embedHtml) {
        if (dev_isUseDirectAPIApproach)
          await tryDirectAPIApproach(instanceDomain);
        if (!isIframeable) dispatch("error", "Unable to load Mastodon post");
        else await tryIframeApproach();
      }

      if (!embedHtml) {
        error = "Unable to load Mastodon post";
      }
    } catch (err) {
      console.error("Mastodon embed error:", err);
      error = "Failed to load Mastodon post";
    } finally {
      loading = false;
    }
  }

  async function tryDirectAPIApproach(domain: string) {
    const postId = extractPostId(postUrl);
    if (!postId) {
      error = "Invalid Mastodon URL";
      return;
    }

    const url = `https://${domain}/api/v1/statuses/${postId}`;
    const urlData = await new Persistence().retrieveUrlData(url, {
      isReturnRawData: true
    });
    if (urlData) {
      const data = parse(urlData.text);
      embedHtml = data.content || "";
      isIframeable = data.content;
    }
  }

  async function tryOEmbedApproach(instanceDomain: string) {
    try {
      const oembedUrl = `https://${instanceDomain}/api/oembed?url=${encodeURIComponent(postUrl)}`;
      const urlData = await new Persistence().retrieveUrlData(oembedUrl, {
        isReturnRawData: true
      });
      if (urlData) {
        const parsed = parse(urlData.text);
        console.log({ parsed });
        if (parsed && parsed.error) {
          dispatch("error", parsed.error);
        } else if (parsed && parsed.html) {
          embedHtml = parsed.html
            .replace(/max-width:\s*\d+px;?/g, "")
            .replace(/style="([^"]*)"/, 'style="$1; width: 80%"');
        }
      }
    } catch (err) {
      console.warn("Mastodon oEmbed failed:", err);
    }
    return false;
  }

  async function tryIframeApproach() {
    try {
      const postId = extractPostId(postUrl);
      const instanceDomain = extractInstanceDomain(postUrl);

      if (postId && instanceDomain) {
        const theme = $appearance?.colorScheme?.isDark ? "dark" : "light";
        const iframeUrl = `${postUrl}/embed`;

        embedHtml = `
          <iframe 
            src="${iframeUrl}" 
            class="mastodon-embed" 
            style="max-width: 100%; border: 0; width: 100%; height: 100%;"
            allowfullscreen
            title="Mastodon post"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox">
          </iframe>
        `;
        return true;
      }
    } catch (err) {
      console.warn("Mastodon iframe approach failed:", err);
    }
    return false;
  }

  function extractInstanceDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  function extractPostId(url: string): string | null {
    const match = url.match(/\/@[^/]+\/(\d+)/);
    return match ? match[1] : null;
  }
</script>

<div {id} class="flex flex-col gap-3 w-full h-full justify-center items-center">
  {#if embedHtml}
    {@html embedHtml}
  {:else}
    <SocialPostLoadingInfo {loading} {error} />
  {/if}
</div>

{#if embedHtml}
  <MastodonWidgetScript />
{/if}
