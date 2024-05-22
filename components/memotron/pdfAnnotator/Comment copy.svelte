<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import TextHiglighter from "./TextHiglighter.svelte";
  import { AnnotationType } from "$lib/tidy/types/memotron/pdfAnnotator.type";

  export let rects: any;
  export let rect: any;
  export let id: string;
  export let color: string;
  export let annotType = AnnotationType.COMMENT;
  export let comment = "";
  export let showIcon = true;
  console.log("rect", rect);
  let svgheight = 24;
  let svgwidth = 24;
  let x1, x2, y1, y2;
  let left: any, top: any, width: any, height: any, scale: any;
  if (rects != undefined) {
    x1 = rects[0].x1;
    x2 = rects[0].x2;
    y1 = rects[0].y1;
    y2 = rects[0].y2;
    left = x1;
    top = y1;
    width = Math.abs(x2 - left);
    height = Math.abs(y2 - top);
    scale = 2;
    left -= scale;
    top -= scale;
    width += scale * 2;
    height += scale * 2;
  }
  const dispatchEvent = createEventDispatcher();
</script>

<!-- <div
  {id}
  class={id}
  data-color={color}
  data-annotType={annotType}
  data-comment={comment}
  on:click={() => {
    dispatchEvent("click", id);
    console.log("comment clicked");
  }}
  on:keydown={() => {}}
  style="position: absolute; left: {left}px; top: {top}px; width: {width}px; height: {height}px; border: 3px solid {color};"
> -->
<div
  class={id}
  data-color={color}
  data-annotType={annotType}
  data-comment={comment}
  style="position: absolute; left: {rects == undefined
    ? rect.left - svgwidth
    : 0}px; top: {rects == undefined
    ? rect.top - svgheight
    : top - 15}px; opacity: 0.5;"
  on:click={() => {
    dispatchEvent("click", id);
    console.log("comment clicked");
  }}
  on:keydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      dispatchEvent("click", id);
      console.log("comment clicked");
    }
  }}
>
  {#if showIcon && annotType === AnnotationType.COMMENT}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={svgheight}
      viewBox="0 -960 960 960"
      width={svgwidth}
      ><path
        d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM880-80 720-240H160q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v720ZM160-320h594l46 45v-525H160v480Zm0 0v-480 480Z"
      /></svg
    >
  {:else if annotType === AnnotationType.TASK}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={svgheight}
      viewBox="0 -960 960 960"
      width={svgwidth}
      ><path
        d="m438-240 226-226-58-58-169 169-84-84-57 57 142 142ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"
      /></svg
    >
  {/if}

  <!-- <Icon icon="flag"></Icon> -->
  <!-- <span class="material-symbols-rounded">{@html "&#Xe0b9"}</span> -->
</div>
<!-- </div> -->
{#if rects != undefined}
  <TextHiglighter
    {color}
    annotType={AnnotationType.HIGHLIGHT}
    {id}
    {rects}
    on:click={() => {
      dispatchEvent("click", id);
      console.log("comment clicked");
    }}
  />
{/if}
