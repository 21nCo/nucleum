<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { mdToolbar, simpleToolbar } from "./keyboardToolbar.action";
  import { cn } from "../../utils/ui.utils";
  import { fly } from "svelte/transition";
  let classList: string = "";
  export { classList as class };
  export let isMdToolbar: boolean = false;
  export let offset: number = 0;
  export let isPreventDefaultOnKeyboardClose: boolean = false;
  let ref: HTMLElement;
  let portal: HTMLElement;

  export function close() {
    const allToolbars = document.querySelectorAll(".toolbar");
    allToolbars.forEach((toolbar) => {
      (toolbar as HTMLElement).style.display = "none";
    });
    document.activeElement?.blur();
  }

  onMount(() => {
    portal = document.createElement("div");
    portal.className = "toolbar-container";
    document.getElementById("toolbars")?.appendChild(portal);
    portal.appendChild(ref);
  });

  onDestroy(() => {
    document.getElementById("toolbars")?.removeChild(portal);
  });
</script>

<div class="toolbar-placeholder" in:fly={{ y: 50 }}>
  <div bind:this={ref}>
    {#if isMdToolbar}
      <div
        class={cn(
          "mdtoolbar toolbar fixed left-0 bottom-0 w-screen border-t border-brs3 z-[70]",
          classList
        )}
        use:mdToolbar={{
          offset,
          isPreventDefaultOnKeyboardClose
        }}
        style="display: none; z-index: 70;"
      >
        <slot />
      </div>
    {:else}
      <div
        class={cn(
          "toolbar fixed left-0 bottom-0 w-screen border-t border-brs3 z-[70]",
          classList
        )}
        use:simpleToolbar
        style="display: none; z-index: 70;"
      >
        <slot />
      </div>
    {/if}
  </div>
</div>

<style>
  .toolbar-placeholder {
    display: none;
  }
</style>
