<script lang="ts">
  import { hoverable } from "@21n/actions/hover.action";
  import Button from "@21n/elements/button/Button.svelte";
  import context from "@21n/stores/context.store";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import type { ICapture } from "@21n/products/memotron/capture/capture.type";
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
  <div class="text-b2 font-medium text-fgs1 text-start">
    {draft.label ? draft.label : "Untitled"}
  </div>
  <div class="flex items-center gap-2">
    <div class="text-b3 text-fgs3 whitespace-nowrap">
      {parseAndFormatDate(new Date(draft.modifiedAt))}
    </div>
    {#if isHovered || $context.isTouchDevice}
      <Button
        icon="trash"
        tooltip="Delete draft"
        size={Size.sm}
        type={ButtonVariant.DANGER}
        style={ButtonStyle.OUTLINED}
        on:click={(e) => {
          e.stopPropagation();
          dispatch("delete", draft);
        }}
      />
    {/if}
  </div>
</button>
