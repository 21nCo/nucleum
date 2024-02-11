<script lang="ts">
  import type {
    NodeMarkdown,
    MdContext,
    MdParams,
    BasicMarkdown
  } from "$lib/tidy/types/md.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Block from "./Block.svelte";
  import { getMdStore, mdContentChangeEvent } from "./markdown.store";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import { generateUID } from "$lib/tidy/utils/utils";
  export let md: NodeMarkdown | BasicMarkdown;
  export let context: MdContext;
  export let params: MdParams | undefined = undefined;
  export let parentBackgroundIndex: number | undefined = undefined;
  const dispatch = createEventDispatcher();
  const mdId = generateUID();
  const mdStore: any = getMdStore(mdId);
  mdStore.load(md, context, params);
  $: console.log("blocks", $mdStore.blocks);
  onMount(() => {
    const mdChangeSub = mdContentChangeEvent.subscribe((val) => {
      // console.log("md content changed", val);
      dispatch("change", $mdStore.blocks);
      if ("blocks" in md) md = { ...md, blocks: $mdStore.blocks };
    });
    return () => {
      mdChangeSub();
    };
  });
</script>

<div
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
      <Block {block} {mdId} />
    {/each}
  </div>
</div>
