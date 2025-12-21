<script lang="ts">
  import { ListType, NodeType } from "@21n/products/memotron/node/node.type";
  import TextContent from "@21n/components/markdown/content/TextContent.svelte";
  import type { MdStoreType } from "@21n/components/markdown/markdown.store";
  import type { IListBlockBody } from "@21n/components/markdown/md.type";
  import type { IRecordId } from "@21n/types/data.type";
  import { createEventDispatcher } from "svelte";
  import Check from "@21n/icons/Check.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  const dispatch = createEventDispatcher();
  export let id: IRecordId;
  export let body: IListBlockBody;
  export let contentType: NodeType;
  export let mdStore: MdStoreType;
  export let isHovering: boolean = false;
  export let isFocusing: boolean = false;

  // if (typeof body === "string") {
  //   body = {
  //     text: body,
  //     indent: 0
  //   };
  // }

  function handleUpdate(e: CustomEvent<string>) {
    dispatch("update", { text: e.detail });
  }

  function onCheckClicked() {
    dispatch("update", { checked: !body.checked });
  }

  function toRoman(num: number): string {
    const romanNumerals = [
      ["M", 1000],
      ["CM", 900],
      ["D", 500],
      ["CD", 400],
      ["C", 100],
      ["XC", 90],
      ["L", 50],
      ["XL", 40],
      ["X", 10],
      ["IX", 9],
      ["V", 5],
      ["IV", 4],
      ["I", 1]
    ] as const;

    let result = "";
    for (const [letter, value] of romanNumerals) {
      while (num >= value) {
        result += letter;
        num -= value;
      }
    }
    return result;
  }
</script>

<div
  class="flex gap-1.5 items-center"
  style={`padding-left: ${body.indent ? body.indent * 1.5 : 0}rem`}
>
  {#if contentType === NodeType.ORDERED_LIST}
    <div class="flex items-center self-start text-fgs1 py-2 tabular-nums w-6">
      {#if !body.indent || body.indent % 3 === 0}
        {body.order ?? 1}.
      {:else if body.indent % 3 === 1}
        {String.fromCharCode(96 + (body.order ?? 1))}.
      {:else}
        {toRoman(body.order ?? 1).toLowerCase()}.
      {/if}
    </div>
  {:else if contentType === NodeType.CHECKLIST}
    <Check isChecked={body.checked} on:click={onCheckClicked} size={Size.sm} />
  {:else if !body.indent || body.indent % 3 === 0}
    <div
      class="w-1.5 h-1.5 min-w-[0.375rem] rounded-full self-start bg-fgs1 mt-3 mx-2"
    ></div>
  {:else if body.indent % 3 === 1}
    <div
      class="w-1.5 h-1.5 min-w-[0.375rem] bg-fgs1 self-start mt-3 mx-2"
    ></div>
  {:else}
    <div
      class="w-1.5 h-1.5 min-w-[0.375rem] self-start rounded-full border border-fgs1 mt-3 mx-2"
    ></div>
  {/if}

  <div class={cn("flex flex-col w-full", { "line-through": body.checked })}>
    <TextContent
      bind:isFocusing
      on:blur
      {mdStore}
      {isHovering}
      bind:text={body.text}
      on:update={handleUpdate}
      {contentType}
      {id}
    />
  </div>
</div>
