<script lang="ts">
  import { AnnotationType } from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.type";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
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
  class="border border-brs3 bg-bgs2 rounded-md p-2"
  on:click|stopPropagation
  on:mousedown|stopPropagation
>
  <textarea
    class="min-w-52 h-20 text-b3 bg-bgs1 rounded-md p-2 outline-none"
    bind:value={comment}
    placeholder="Enter your comment"
  ></textarea>
  {#if (annotationMode === AnnotationType.TASK && editingItemType != AnnotationType.TASK) || editingItemType === AnnotationType.TASK}
    <DatePicker date={dueDate} />
  {/if}
  <div class="flex justify-end gap-1 items-center">
    {#if editingMode}
      <Button
        size={Size.xs}
        type={ButtonVariant.PRIMARY}
        label="Update"
        on:click={() => dispatchEvent("update", comment)}
      />
    {:else}
      <Button
        size={Size.xs}
        type={ButtonVariant.PRIMARY}
        label="Save"
        on:click={() => {
          if (
            editingItemType == AnnotationType.TASK ||
            annotationMode === AnnotationType.TASK
          )
            dispatchEvent("save", { comment, dueDate });
          else dispatchEvent("save", { comment });
        }}
      />
    {/if}
    <Button
      size={Size.xs}
      parentBgIndex={2}
      label="Cancel"
      on:click={() => dispatchEvent("cancel")}
    />
  </div>
</div>
