<script lang="ts">
  import type {
    Block,
    IMarkdownStore
  } from "$lib/client/types/memotron/md.type";
  import { onMount } from "svelte";
  import BlockContent from "./content/BlockContent.svelte";
  import LeftControls from "./LeftControls.svelte";
  import type { MdStoreType } from "./markdown.store";
  import { NodeType } from "$lib/client/types/memotron/node.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  export let block: Block;
  export let mdStore: MdStoreType;
  let isHovering: boolean = false;
  let isFocusing: boolean = false;
  let isReRendering: boolean = false;
  let isShowBgOnFocus: boolean = true;
  // const mdStore = getMdStore(mdId);
  onMount(() => {
    //TODO - check the need for rerendering
    const mdStoreSub = mdStore.subscribe((md: IMarkdownStore) => {
      // console.log("re-render block", md.reRenderBlock);
      if (md.reRenderBlock === block.id) {
        // console.log("re-rendering block", block.id);
        isReRendering = true;
        setTimeout(() => {
          isReRendering = false;
        }, 0.1);
      }
    });
    return () => {
      mdStoreSub();
    };
  });
</script>

<div
  class="relative flex items-start w-full"
  on:pointerenter={() => {
    isHovering = true;
  }}
  on:pointerleave={() => {
    isHovering = false;
  }}
>
  {#if isHovering || isFocusing}
    <div class="absolute -left-8 flex h-full items-center justify-center">
      <LeftControls {mdStore} />
    </div>
    {#if $mdStore.params?.isNodular && block.contentType === NodeType.HEADING1}
      <div class="absolute right-10 flex h-full items-center justify-center">
        <Button
          label="focus (Cmd + M)"
          type={ButtonVariant.PRIMARY}
          size={Size.xs}
        />
      </div>
    {/if}
  {/if}
  <div
    id="sss"
    class="-ml-10 pl-10 flex grow rounded-md {(isHovering || isFocusing) &&
    isShowBgOnFocus &&
    $mdStore.params?.isNodular &&
    !$mdStore.params?.isReadOnly
      ? 'bg-bgs2'
      : ''}"
  >
    <BlockContent
      {block}
      {mdStore}
      {isHovering}
      bind:isFocusing
      on:change
      on:insert
      on:convert
      on:delete
      on:blur={() => {
        isHovering = false;
      }}
    />
  </div>
</div>

<!-- <style>
  #sss:hover::before {
    content: "sss";
    width: 2rem;
  }
  #sss:before {
    content: "";
    width: 2rem;
  }
</style> -->
