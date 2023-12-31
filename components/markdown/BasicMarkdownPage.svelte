<script lang="ts">
  import AppLoadingView from "$lib/tidy/layout/paint/AppLoadingView.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import { MdContext, type BasicMarkdown } from "$lib/tidy/types/md.type";
  import { onMount, tick } from "svelte";
  import Markdown from "./Markdown.svelte";
  export let md: BasicMarkdown | undefined = undefined;
  export let src: string | undefined = undefined;
  window.scrollTo(0, 0);
  $: if (src) {
    md = $appStore?.appData?.md?.[src];
  }
  onMount(async () => {
    await tick();
    console.log("scrolling to top", {
      scrollY: window.scrollY,
      scrollTop: document.body.scrollTop,
    });
    window.scroll(0, 0);
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  });
</script>

{#if md}
  <article class="p-6 md:p-10 xl:p-16">
    <Markdown {md} context={MdContext.BASIC} params={{ isReadOnly: true }} />
  </article>
{:else}
  <AppLoadingView message="loading..." />
{/if}
