<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { AnnotationType } from "../pdfAnnotator.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { resolveAnnotationModes } from "../pdfAnnotator.utils";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import HighlightColors from "../../common/highlighters/HighlightColors.svelte";
  import type { IToggleItem } from "$lib/client/elements/toggle/toggle.type";
  export let selectedColor = "";
  export let style = "";
  let dispatchEvent = createEventDispatcher();
  function propagate(annotation: AnnotationType) {
    dispatchEvent("annotate", annotation);
  }
  const annotationModes: IToggleItem[] = resolveAnnotationModes();
</script>

<div
  class="flex gap-2 text-lg min-h-fit px-3 py-1 material-symbols-rounded bg-bgs2 rounded-md border border-brs3"
  {style}
  on:mousedown|stopPropagation
>
  <div class="flex gap-1">
    {#each annotationModes as mode}
      <Button
        icon={mode.icon}
        parentBgIndex={2}
        on:click={() => {
          propagate(mode.value);
        }}
      />
    {/each}
  </div>
  <!-- <Divider orientation={Orientation.Vertical} />
  <HighlightColors bind:selected={selectedColor} on:color /> -->
</div>
