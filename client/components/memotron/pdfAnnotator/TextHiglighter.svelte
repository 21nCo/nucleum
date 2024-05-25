<script lang="ts">
  import { AnnotationType } from "$lib/client/types/memotron/pdfAnnotator.type";
  import { createEventDispatcher } from "svelte";
  export let id = "";
  export let color = "";
  export let rects: any = [];
  export let annotType: AnnotationType = AnnotationType.HIGHLIGHT;

  let topValue = annotType == "UNDERLINE" ? "100%" : "40%";
  let dispatchEvent = createEventDispatcher();
  // console.log("rects text highlighter", rects);
  function calculateStyle(rect: any) {
    let bg = "";
    let { x1: left, x2, y1: top, y2 } = rect;
    let width = Math.abs(x2 - left);
    let height = Math.abs(y2 - top);
    let scale = 0.3;
    left -= scale;
    top += scale;
    width += scale * 2;
    height -= scale * 2;
    if (
      annotType === "HIGHLIGHT" ||
      annotType === "COMMENT" ||
      annotType === "TASK"
    )
      bg = `background-color:${color};opacity:0.3;`;
    return `position:absolute;left: ${left}px;top: ${top}px;width: ${width}px;height: ${height}px;${bg};-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;`;
  }
</script>

{#each rects as rect, index}
  <div
    id={index == 0 ? id : ""}
    class={id}
    data-color={color}
    data-annotType={annotType}
    style={calculateStyle(rect)}
    on:click|stopPropagation={() => {
      dispatchEvent("click", id);
    }}
    on:keydown={() => {}}
    on:mousedown|stopPropagation
  >
    {#if annotType == AnnotationType.UNDERLINE || annotType == AnnotationType.LINETHROUGH}<div
        style="position: absolute;
    top: {topValue};
    left: 0;
    border-bottom: 3px solid {color};
    width: 100%;"
      ></div>
    {/if}
  </div>
{/each}

<!-- {#if annotType !== "HIGHLIGHT"}
  <style>
  div:before {
    content: "";
    position: absolute;
    top: {topValue};
    left: 0;
    border-bottom: 1px solid red;
    width: 100%;
  }
  </style>
{/if} -->
