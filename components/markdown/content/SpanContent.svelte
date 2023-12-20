<script lang="ts">
  import { SpanType, type SpanContent } from "$lib/tidy/types/md.type";
  import TextWithSpans from "./TextWithSpans.svelte";
  export let span: SpanContent;
  let style: string = "";
  $: switch (span.type) {
    case SpanType.BOLD:
      style = "font-bold";
      break;
    case SpanType.ITALIC:
      style = "italic";
      break;
    case SpanType.UNDERLINE:
      style = "underline";
      break;
    case SpanType.STRIKE:
      style = "line-through";
      break;
    case SpanType.CODE:
      style = "font-mono bg-gray-100 rounded px-1";
      break;
    default:
      style = "";
      break;
  }
  function handleSelect(event: any) {
    console.log("select", event);
  }
  function handleMouseup(event: any) {
    const sel = window.getSelection();
    const range = sel?.getRangeAt(0);
    console.log("mouseup", event, range);
  }
</script>

<span class={style}>
  {#if typeof span.content === "string"}
    <span
      on:mouseup={handleMouseup}
      style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word; caret-color: rgb(55, 53, 47);"
      class="outline-none">{span.content}</span
    >
  {:else}
    <TextWithSpans content={span.content} />
  {/if}
</span>
