<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import GridInputElement from "./GridInputElement.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  export let size: number;
  export let id: string;
  export let top: number;
  export let left: number;
  export let index: { r: number; c: number };
  export let children: any;
  export let value: string;
  let isChild = id.split("-")[0] == "child";
  let colors = ["red", "blue", "green", "yellow", "pink"];
  // console.log({ index });
  const dispatch = createEventDispatcher();
  let textarea: HTMLDivElement;
  let parent: HTMLDivElement;
  function addChild() {
    children.push({
      id: "child-" + generateUID(),
      value: "child",
      children: [],
      size: size * 0.8,
      top: 0,
      left: 0,
      index: { r: 0, c: 0 }
    });
    console.log("children added");
    // size = size * 1.5;
    children = children;
  }
  onMount(() => {
    // for (let i = 0; i < children
    // textarea.style.height = "auto";
    // textarea.style.height = `${textarea.scrollHeight}px`;
  });

  const resize = () => {
    console.log("resizing", textarea.style.height);
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
</script>

<div
  {id}
  style="position:{!isChild
    ? 'absolute'
    : 'relative'};top:{top}px;left:{left}px;width:{isChild
    ? 'auto'
    : size}px;height:{isChild ? 'auto' : size}px;border:1px solid {colors[
    index.r % colors.length
  ]}; "
>
  <!-- <div bind:this={textarea} on:input> -->
  <div
    {id}
    bind:this={parent}
    style="width:{size * 0.8}px;border:2px solid yellow"
  >
    <span contenteditable="true" bind:innerText={value}></span>
    <button on:click={addChild} style="background-color:gray">+Child</button>
    {#each children as child (child.id)}
      <GridInputElement bind:value={child.value} size={size * 0.8} {...child} />
    {/each}
  </div>
  <!-- <div
      contenteditable="true"
      bind:this={textarea}
      on:input
      bind:innerText={value}
      style="position:absolute;top:0px;left:0px;"
    >
      <button>Button</button>
    </div> -->
  <!-- <input
      type="textarea"
      value={index.r + "," + index.c}
      style="position:absolute;top:0px;left:0px;width:{size *
        0.8}px;height:{size * 0.8}px;"
    />-->
  {#if !isChild}
    <button
      id={"sib" + id}
      style="background-color:pink;position:absolute;top:0px;right:0px;width:{size *
        0.1}px;height:{size * 0.9}px;"
      on:click={() => dispatch("rightSiblingRequired", index)}>+</button
    ><button
      id={"child" + id}
      style="background-color:pink;position:absolute;bottom:0px;left:0px;width:{size *
        0.9}px;height:{size * 0.1}px;"
      on:click={() => dispatch("bottomSiblingRequired", index)}>+</button
    >{/if}
</div>
