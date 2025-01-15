<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { onMount } from "svelte";

  export let tweetUrl: string;
  let id: string = generateSimpleRandomId();

  onMount(() => {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    document.head.appendChild(script);

    window.twttr?.widgets.createTweet(
      getTweetId(tweetUrl),
      document.getElementById(id),
      {
        theme: $appearance?.colorScheme?.isDark ? "dark" : "light"
        // width: 550
        // conversation: "none",
        // cards: "visible"
      }
    );
  });

  function getTweetId(url: string) {
    return url.split("/").pop();
  }
</script>

<div {id} class="w-full h-full flex justify-center items-center"></div>
