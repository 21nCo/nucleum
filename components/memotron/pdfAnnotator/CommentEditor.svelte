<script lang="ts">
  import { AnnotationType } from "$lib/tidy/types/memotron/pdfAnnotator.type";
  import DatePicker from "$lib/tidy/elements/datetime/DatePicker.svelte";
  import { createEventDispatcher } from "svelte";
  export let annotationMode: AnnotationType;
  export let style = "";
  export let dueDate: Date = new Date();
  export let comment = "";
  export let editingItemType: string;
  let editingMode = comment.length > 0;
  let dispatchEvent = createEventDispatcher();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  {style}
  class="bg-gray-300 border border-black"
  on:click|stopPropagation
  on:mousedown|stopPropagation
>
  <textarea
    class="min-w-20 text-sm"
    bind:value={comment}
    placeholder="Enter your comment"
  ></textarea>
  {#if annotationMode === AnnotationType.TASK || editingItemType === AnnotationType.TASK}
    <DatePicker date={dueDate} />
  {/if}
  <div>
    {#if editingMode}
      <button on:click={() => dispatchEvent("updateComment", comment)}
        >Update</button
      >
    {:else}
      <button
        on:click={() => {
          if (annotationMode === AnnotationType.TASK)
            dispatchEvent("saveComment", { comment, dueDate });
          else dispatchEvent("saveComment", { comment });
        }}>Save</button
      >
    {/if}
    <button on:click={() => dispatchEvent("cancelComment")}>Cancel</button>
  </div>
</div>
