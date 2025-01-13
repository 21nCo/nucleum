<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { fly } from "svelte/transition";
  let isHovering = false;
</script>

<div class="fixed right-0 inset-y-0 h-full flex justify-center items-center">
  <button
    class="flex items-center gap-1 w-fit h-fit bg-bgs2 text-fgs1 rounded-l-full border-l border-y border-brs3 shadow-md px-1"
    on:click
    use:hoverable={{
      onHover: (isHoveringParam) => {
        isHovering = isHoveringParam;
      }
    }}
  >
    <SubAtomLogo subatom="memotron" size={Size.sm} />
    {#if isHovering}
      <span in:fly={{ x: 50 }}> Memotron clipper </span>
    {/if}
  </button>
</div>
