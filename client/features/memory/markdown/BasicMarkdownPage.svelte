<script lang="ts">
  import PageLoadingAnimation from "@21n/ui/elements/feedback/animations/PageLoadingAnimation.svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import type { IMarkdown } from "@nucleum/features/memory/markdown/md.type";
  import { onMount, tick } from "svelte";
  import MarkdownView from "@nucleum/features/memory/markdown/Markdown.svelte";
  let {
    md = undefined,
    src = undefined
  }: {
    md?: IMarkdown | undefined;
    src?: string | undefined;
  } = $props();
  window.scrollTo(0, 0);
  const resolvedMd = $derived(src ? $appStore?.appData?.md?.[src] : md);
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

{#if resolvedMd}
  <article class="p-6 tp:p-10 dp:p-16">
    <MarkdownView md={resolvedMd} params={{ isReadOnly: true }} />
  </article>
{:else}
  <div class="flex items-center justify-center p-10">
    <PageLoadingAnimation />
  </div>
{/if}
