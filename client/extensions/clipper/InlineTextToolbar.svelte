<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import HightlightColorItem from "./HightlightColorItem.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import { webpage } from "./contentScripts/store";
  const dispatch = createEventDispatcher();
  export let id: string | null = null;
  export let colors: string[];
  export let selectedColor: string | null = null;
  let isLinkboxOpened = false;
  let clip: any;
  $: if (id) clip = $webpage.clips.find((clip) => clip.id === id);
  // $: console.log({ colors, selectedColor, isExistingClip });
</script>

<div
  class="shadow-md border border-brs2 bg-bgs1 rounded-md flex flex-col justify-center items-center px-4 py-3 gap-3"
>
  <div class="flex justify-center items-center gap-3">
    <span class="flex gap-2 items-center">
      {#each colors as color}
        <HightlightColorItem
          {color}
          isActive={color === selectedColor}
          on:click={() => {
            // console.log(color);
            dispatch("color", color);
          }}
        />
      {/each}
    </span>
    {#if id}
      <Divider />
      <Button
        icon={isLinkboxOpened ? "link-arrow-down" : "link-arrow-left"}
        type={isLinkboxOpened ? ButtonVariant.PRIMARY : ButtonVariant.SECONDARY}
        label="link"
        size={Size.xs}
        on:click={() => {
          isLinkboxOpened = !isLinkboxOpened;
        }}
      />
      <Button icon="document-text" tooltip="Add notes" />
      <Button icon="trash" tooltip="Delete clip" />
    {/if}
  </div>
  {#if isLinkboxOpened}
    <LinkBoxOnClipper
      on:link={(e) => {
        if (e.detail.item.id) webpage.linkClip(id, e.detail.item.id);
      }}
    />
    <LinkItems links={clip?.links} on:click />
  {/if}
</div>
