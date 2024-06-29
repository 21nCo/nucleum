<script lang="ts">
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  let isHovering = false;
</script>

<HoverableElement
  type="button"
  bind:isHovering
  class="fixed right-0 top-1/2 w-5 h-6 hover:w-20 bg-aps1 text-bgs1 dark:text-fgs1 rounded-l-full border-l border-y border-brs3 shadow-md flex px-1 items-center justify-center"
  on:click
>
  <Icon
    icon={isHovering ? "chevleft" : "chevright"}
    class="stroke-bgs1 dark:stroke-fgs1"
  />
  {isHovering ? "Clipper" : ""}
</HoverableElement>
