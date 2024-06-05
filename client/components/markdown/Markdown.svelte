<script lang="ts">
  import type {
    IMarkdown,
    IMarkdownParams
  } from "$lib/client/types/memotron/md.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Block from "./Block.svelte";
  import { getMdStore, mdContentChangeEvent } from "./markdown.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { generateUID } from "$lib/client/utils/utils";
  export let md: IMarkdown;
  export let params: IMarkdownParams | undefined = undefined;
  export let parentBackgroundIndex: number | undefined = undefined;
  const dispatch = createEventDispatcher();
  export let id: string | undefined = undefined;
  let mdId: string = id ?? generateUID();
  const mdStore = getMdStore(mdId);
  // console.log(
  //   "md",
  //   md.blocks.map((x) => x.id)
  // );
  mdStore.load(md, params);
  // $: console.log("blocks", $mdStore.blocks);
  onMount(() => {
    const mdChangeSub = mdContentChangeEvent.subscribe((val) => {
      // console.log("md content changed", val);
      if ("blocks" in md) md = { ...md, blocks: $mdStore.blocks };
      dispatch("blocks", $mdStore.blocks);
    });
    return () => {
      mdChangeSub();
    };
  });
</script>

<div
  id="markDown-{mdId}"
  class="relative flex flex-col justify-start items-start text-start w-full h-full"
>
  <div class="flex justify-between">
    <div>
      {#if params?.title}
        <Text content={params.title} style={TextStyle.PANEL_HEADING} />
      {/if}
    </div>
    <div class="absolute flex gap-2 top-0 right-0 z-40">
      {#if params?.actions?.includes("copy")}
        <div>
          <Button
            icon="copy"
            tooltip="Copy markdown"
            label="Copy markdown"
            size={Size.xs}
            {parentBackgroundIndex}
            on:click={() => {
              const markdownAsText = mdStore.generateMarkdownText();
              navigator.clipboard.writeText(markdownAsText);
            }}
          />
        </div>
      {/if}
      {#if params?.actions?.includes("copyRaw")}
        <div>
          <Button
            icon="copy"
            tooltip="Copy raw md"
            label="Copy raw md"
            size={Size.xs}
            {parentBackgroundIndex}
            on:click={() => {
              const rawMdJson = JSON.stringify($mdStore.blocks);
              navigator.clipboard.writeText(rawMdJson);
            }}
          />
        </div>
      {/if}
    </div>
  </div>
  <div class="grow w-full">
    {#each $mdStore.blocks as block (block.id)}
      <Block
        {block}
        {mdStore}
        on:change={(e) => {
          dispatch("change", {
            ...e.detail,
            md: { ...md, blocks: $mdStore.blocks }
          });
        }}
        on:insert={(e) => {
          dispatch("insert", {
            ...e.detail,
            md: { ...md, blocks: $mdStore.blocks }
          });
        }}
        on:delete={(e) => {
          dispatch("delete", {
            ...e.detail,
            md: { ...md, blocks: $mdStore.blocks }
          });
        }}
        on:convert={(e) => {
          dispatch("convert", {
            ...e.detail,
            md: { ...md, blocks: $mdStore.blocks }
          });
        }}
      />
    {/each}
  </div>
</div>
