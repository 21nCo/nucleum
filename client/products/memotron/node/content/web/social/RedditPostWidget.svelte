<script lang="ts">
  import { onMount } from "svelte";
  import appearance from "@21n/stores/appearance.store";
  import { parse } from "@21n/shared-utils/json.utils";
  import { Persistence } from "@21n/persistence/persistence";
  import RedditWidgetScript from "@21n/products/memotron/node/content/web/social/RedditWidgetScript.svelte";
  import SocialPostLoadingInfo from "@21n/products/memotron/node/content/web/social/SocialPostLoadingInfo.svelte";

  export let postUrl: string;
  let embedHtml: string = "";
  let loading: boolean = true;
  let error: string = "";

  onMount(async () => {
    await loadRedditEmbed();
  });

  async function loadRedditEmbed() {
    try {
      loading = true;

      const theme = $appearance?.colorScheme?.isDark ? "dark" : "light";
      const oembedUrl = `https://www.reddit.com/oembed?url=${encodeURIComponent(postUrl)}&theme=${theme}&omitscript=true`;

      const urlData = await new Persistence().retrieveUrlData(oembedUrl, {
        isReturnRawData: true
      });
      if (urlData) {
        const parsed = parse(urlData.text);
        embedHtml = parsed.html;
        return true;
      } else {
        error = "Failed to load Reddit post";
      }
    } catch (err) {
      console.error("Reddit embed error:", err);
      error = "Failed to load Reddit post";
    } finally {
      loading = false;
    }
  }
</script>

<div class="w-full h-full flex justify-center items-center">
  {#if embedHtml}
    {@html embedHtml}
  {:else}
    <SocialPostLoadingInfo {loading} {error} platform="Reddit" />
  {/if}
</div>

{#if embedHtml}
  <RedditWidgetScript />
{/if}
