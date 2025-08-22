<script lang="ts">
  import { onMount } from "svelte";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import SocialPostLoadingInfo from "./SocialPostLoadingInfo.svelte";

  export let postUrl: string;

  let id: string = generateSimpleRandomId();
  let loading: boolean = true;
  let error: string = "";
  const dev_isUseEmbedScriptApproach = false;

  onMount(() => {
    if (dev_isUseEmbedScriptApproach) {
      loadLinkedInWidget();
    } else {
      tryIframeApproach();
    }
  });

  function loadLinkedInWidget() {
    try {
      loading = true;

      if (
        !document.querySelector('script[src*="platform.linkedin.com/in.js"]')
      ) {
        const script = document.createElement("script");
        script.src = "https://platform.linkedin.com/in.js";
        script.async = true;
        script.type = "text/javascript";
        script.onload = () => {
          createLinkedInEmbed();
        };
        document.head.appendChild(script);
      } else {
        createLinkedInEmbed();
      }
    } catch (err) {
      console.error("LinkedIn widget error:", err);
      error = "Failed to load LinkedIn post";
      loading = false;
    }
  }

  function createLinkedInEmbed() {
    try {
      const element = document.getElementById(id);
      if (element && window.IN) {
        element.innerHTML = `
          <script type="IN/Share" data-url="${postUrl}">
          <\/script>
        `;

        window.IN.parse(element);
        loading = false;
      } else {
        setTimeout(createLinkedInEmbed, 100);
      }
    } catch (err) {
      console.error("LinkedIn embed creation error:", err);
      tryIframeApproach();
      loading = false;
    }
  }

  function extractLinkedInPostId(url: string): string | null {
    const matches = url.match(/activity[:-](\d+)/);
    return matches ? matches[1] : null;
  }

  function tryIframeApproach() {
    try {
      const element = document.getElementById(id);
      if (element) {
        const extractedId = extractLinkedInPostId(postUrl);
        if (extractedId && element) {
          element.innerHTML = `
            <iframe 
              src="https://www.linkedin.com/embed/feed/update/${extractedId}" 
              class="w-full h-full flex justify-center items-center"
              frameborder="0" 
              allowfullscreen="" 
              title="Embedded post"
              style="max-width: 100%;">
            </iframe>
          `;
        } else {
          error = "Unable to load LinkedIn post";
        }
      }
    } catch (err) {
      console.error("LinkedIn iframe approach failed:", err);
    }
  }

  declare global {
    interface Window {
      IN: {
        parse(element: Element): void;
      };
    }
  }
</script>

<div {id} class="w-full max-w-2xl h-full flex justify-center items-center">
  <SocialPostLoadingInfo {loading} {error} />
</div>
