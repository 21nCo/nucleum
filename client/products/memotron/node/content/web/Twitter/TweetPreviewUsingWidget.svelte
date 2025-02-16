<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import context from "$lib/client/stores/context.store";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { onMount } from "svelte";

  interface TwitterWidget {
    widgets: {
      createTweet(
        tweetId: string,
        element: HTMLElement | null,
        options?: {
          theme?: string;
          width?: number;
          conversation?: string;
          cards?: string;
        }
      ): Promise<any>;
    };
  }

  declare global {
    interface Window {
      twttr: TwitterWidget;
    }
  }

  export let tweetUrl: string;
  let id: string = generateSimpleRandomId();
  let widgetScriptLoaded = false;

  onMount(() => {
    const loadTwitterWidget = () => {
      if (
        !document.querySelector(
          'script[src*="platform.twitter.com/widgets.js"]'
        )
      ) {
        const script = document.createElement("script");
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.onload = () => {
          widgetScriptLoaded = true;
          createTweetWidget();
        };
        document.head.appendChild(script);
      } else {
        widgetScriptLoaded = true;
        createTweetWidget();
      }
    };

    const createTweetWidget = () => {
      const element = document.getElementById(id);
      if (window.twttr && element) {
        window.twttr.widgets
          .createTweet(getTweetId(tweetUrl), element, {
            theme: $appearance?.colorScheme?.isDark ? "dark" : "light",
            width: 450
            // conversation: "none",
            // cards: "visible"
          })
          .then((el) => {
            if (el) {
              console.log("Tweet widget created successfully");
            }
          });
      } else if (widgetScriptLoaded) {
        setTimeout(createTweetWidget, 100);
      }
    };

    loadTwitterWidget();
  });

  function getTweetId(url: string) {
    return url.split("/").pop() || "";
  }
</script>

<div class="relative w-full h-full">
  {#if $context.isEmbed}
    <button class="absolute inset-0 z-10" on:click></button>
  {/if}
  <div {id} class="w-full h-full flex justify-center items-center"></div>
</div>
