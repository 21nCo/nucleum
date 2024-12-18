<script lang="ts">
  import {
    ListType,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import TextContent from "../content/TextContent.svelte";
  import type { MdStoreType } from "../markdown.store";
  import type { IListBlockBody } from "../md.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { createEventDispatcher } from "svelte";
  import Check from "$lib/client/icons/Check.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
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
  class="flex gap-2 items-center"
  style={`padding-left: ${body.indent ? body.indent * 1.5 : 0}rem`}
>
  {#if contentType === NodeType.ORDERED_LIST}
    <div class="flex justify-center items-center text-fgs1">
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
      class="w-1.5 h-1.5 min-w-[0.375rem] rounded-full bg-fgs1 my-4 mx-2"
    ></div>
  {:else if body.indent % 3 === 1}
    <div class="w-1.5 h-1.5 min-w-[0.375rem] bg-fgs1 my-4 mx-2"></div>
  {:else}
    <div
      class="w-1.5 h-1.5 min-w-[0.375rem] rounded-full border border-fgs1 my-4 mx-2"
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
      contentType={NodeType.LIST}
      {id}
    />
  </div>
</div>
