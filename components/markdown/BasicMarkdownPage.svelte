<script lang="ts">
  import AppLoadingView from "$lib/tidy/layout/paint/AppLoadingView.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import type { Markdown } from "$lib/tidy/types/memotron/md.type";
  import { onMount, tick } from "svelte";
  import MarkdownView from "./Markdown.svelte";
  export let md: Markdown | undefined = undefined;
  export let src: string | undefined = undefined;
  window.scrollTo(0, 0);
  $: if (src) {
    md = $appStore?.appData?.md?.[src];
  }
  onMount(async () => {
    await tick();
    console.log("scrolling to top", {
      scrollY: window.scrollY,
      scrollTop: document.body.scrollTop
    });
    window.scroll(0, 0);
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  });
</script>

{#if md}
  <article class="p-6 md:p-10 xl:p-16">
    <MarkdownView {md} params={{ isReadOnly: true }} />
  </article>
{:else}
  <AppLoadingView message="loading..." />
{/if}
