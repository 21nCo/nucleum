<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDate } from "$lib/client/utils/time.utils";
  import type { ICapture } from "../capture.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let draft: ICapture;
  let isHovered = false;
</script>

<button
  class="flex w-full justify-between items-center gap-2 p-2 hover:bg-bgs2 rounded-md h-10 min-h-10"
  use:hoverable={{
    onHover: (val) => {
      isHovered = val;
    }
  }}
  on:click
>
  <div class="text-b2 font-medium text-fgs1">
    {draft.label ? draft.label : "Untitled"}
  </div>
  {#if isHovered}
    <Button
      icon="ph:trash-light"
      tooltip="Delete draft"
      size={Size.sm}
      type={ButtonVariant.DANGER}
      style={ButtonStyle.OUTLINED}
      on:click={(e) => {
        e.stopPropagation();
        dispatch("delete", draft);
      }}
    />
  {:else}
    <div class="text-b3 text-fgs3">
      {formatDate(new Date(draft.modifiedAt))}
    </div>
  {/if}
</button>
