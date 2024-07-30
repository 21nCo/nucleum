<script lang="ts">
  import ColorPalette from "$lib/client/elements/colorPicker/colorPalette.svelte";
  import { createEventDispatcher } from "svelte";
  import { AnnotationType } from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.type";
  // export let options = ["NOTES", "HIGHLIGHT", "UNDERLINE", "STRIKETHROUGH"];
  export let selectedColor = "#FF0000";
  export let style = "";
  export let pageNumber = 1;
  export let totalPages = 1;
  export let annotationMode: AnnotationType;

  let additionalClasses = " text-base bg-bgs4";
  let classList = ["", "", "", "", "", ""];
  let dispatchEvent = createEventDispatcher();
  function checkAnnotationMode(selectedAnnotation: AnnotationType) {
    console.log("selectedAnnotation", selectedAnnotation);
    classList = ["", "", "", "", "", ""];
    if (selectedAnnotation === annotationMode) {
      annotationMode = AnnotationType.NONE;
    } else if (selectedAnnotation === AnnotationType.COMMENT) {
      annotationMode = AnnotationType.COMMENT;
      classList = [additionalClasses, "", "", "", ""];
    } else if (selectedAnnotation === AnnotationType.TASK) {
      annotationMode = AnnotationType.TASK;
      classList = ["", additionalClasses, "", "", "", ""];
    } else if (selectedAnnotation === AnnotationType.SHAPE) {
      annotationMode = AnnotationType.SHAPE;
      classList = ["", "", additionalClasses, "", "", ""];
    } else if (selectedAnnotation === AnnotationType.HIGHLIGHT) {
      annotationMode = AnnotationType.HIGHLIGHT;
      classList = ["", "", "", additionalClasses, "", ""];
    } else if (selectedAnnotation === AnnotationType.LINETHROUGH) {
      annotationMode = AnnotationType.LINETHROUGH;
      classList = ["", "", "", "", additionalClasses, ""];
    } else if (selectedAnnotation === AnnotationType.UNDERLINE) {
      annotationMode = AnnotationType.UNDERLINE;
      classList = ["", "", "", "", "", additionalClasses];
    }
    console.log("annotationMode", annotationMode);
  }
</script>

<div
  class="flex w-80 h-7 justify-between text-lg material-symbols-rounded bg-bgs2 rounded-md"
  {style}
>
  <!-- disabling shape until bug is fixed 
    <button
    class={"w-1/10 hover:bg-bgs3 px-1 rounded-md text-fgs1" + classList[2]}
    on:click={() => {
      //dispatchEvent("annotate", "HIGHLIGHT");
      checkAnnotationMode(AnnotationType.SHAPE);
    }}>{@html "&#Xe871"}</button
  > -->
  <button
    class={"w-1/10 hover:bg-bgs3 px-1 rounded-md text-fgs1" + classList[3]}
    on:click={() => {
      //dispatchEvent("annotate", "HIGHLIGHT");
      checkAnnotationMode(AnnotationType.HIGHLIGHT);
    }}
  >
    ink_marker
  </button>
  <button
    class={"w-1/10 hover:bg-bgs3 px-1 rounded-md text-fgs1" + classList[4]}
    on:click={() => {
      //dispatchEvent("annotate", "LINE-THROUGH");
      checkAnnotationMode(AnnotationType.LINETHROUGH);
    }}
  >
    strikethrough_s
  </button>
  <button
    class={"w-1/10 hover:bg-bgs3 px-1 rounded-md text-fgs1" + classList[5]}
    on:click={() => {
      //dispatchEvent("annotate", "UNDERLINE");
      checkAnnotationMode(AnnotationType.UNDERLINE);
    }}
  >
    format_underlined
  </button>
  <button
    class={"w-1/10 hover:bg-bgs3 px-1 rounded-md text-fgs1"}
    on:click={() => {
      dispatchEvent("pageRerender", "ZOOMIN");
    }}>{@html "&#Xe8ff"}</button
  >
  <span class="text-fgs1 text-sm pt-1 font-sans"
    >{pageNumber} / {totalPages}</span
  >

  <button
    class={"w-1/10 hover:bg-bgs3 px-1 rounded-md text-fgs1"}
    on:click={() => {
      dispatchEvent("pageRerender", "ZOOMOUT");
    }}>{@html "&#Xe900"}</button
  ><button
    class={"w-1/10 hover:bg-bgs3 px-1 rounded-md text-fgs1" + classList[0]}
    on:click={() => {
      //dispatchEvent("annotate", "COMMENT");
      checkAnnotationMode(AnnotationType.COMMENT);
    }}
  >
    comment
  </button>
  <button
    class={"w-1/10 hover:bg-bgs3 px-1 rounded-md text-fgs1" + classList[1]}
    on:click={() => {
      //dispatchEvent("annotate", "HIGHLIGHT");
      checkAnnotationMode(AnnotationType.TASK);
    }}>{@html "&#Xe2e6"}</button
  >

  <div style="border-left:1px solid gray"></div>
  <ColorPalette bind:selectedColor on:colorClicked />
</div>
