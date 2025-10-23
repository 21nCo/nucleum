<script lang="ts">
  import AppLoadingView from "@21n/layout/paint/AppLoadingView.svelte";
  import { appStore } from "@21n/stores/app.store";
  import type { IMarkdown } from "@21n/components/markdown/md.type";
  import { onMount, tick } from "svelte";
  import MarkdownView from "@21n/components/markdown/Markdown.svelte";
  export let md: IMarkdown | undefined = undefined;
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
  <article class="p-6 tp:p-10 dp:p-16">
    <MarkdownView {md} params={{ isReadOnly: true }} />
  </article>
{:else}
  <AppLoadingView message="loading..." />
{/if}
