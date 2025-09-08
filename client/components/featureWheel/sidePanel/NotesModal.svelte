<script lang="ts">
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  export let notes: string;
  $: renderedContent = renderMdAsHtml(notes);
</script>

<div class="h-full flex flex-col justify-between w-96 p-4 space-y-4">
  <div class="flex space-y-2 overflow-y-auto">
    <div class="text-b2 leading-relaxed prose prose-sm max-w-none">
      {@html renderedContent}
    </div>
  </div>
  <div class="flex text-b3 text-fgs3">
    All of the views posted in the notes are subjective and based on our team
    member's years of personal experience using productivity tools and research
    conducted specifically for this comparison.
  </div>
</div>
