<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { mdToolbar, simpleToolbar } from "./keyboardToolbar.action";
  import { cn } from "../../utils/ui.utils";
  let classList: string = "";
  export { classList as class };
  export let isMdToolbar: boolean = false;
  export let offset: number = 0;
  export let isPreventDefaultOnKeyboardClose: boolean = false;
  let ref: HTMLElement;
  let portal: HTMLElement;

  onMount(() => {
    portal = document.createElement("div");
    portal.className = "toolbar";
    document.getElementById("toolbars")?.appendChild(portal);
    portal.appendChild(ref);
  });

  onDestroy(() => {
    document.getElementById("toolbars")?.removeChild(portal);
  });
</script>

<div class="toolbar-placeholder">
  <div bind:this={ref}>
    {#if isMdToolbar}
      <div
        class={cn(
          "fixed left-0 bottom-0 w-screen border-t border-brs3 z-50",
          classList
        )}
        use:mdToolbar={{
          offset,
          isPreventDefaultOnKeyboardClose
        }}
        style="display: none;"
      >
        <slot />
      </div>
    {:else}
      <div
        class={cn(
          "fixed left-0 bottom-0 w-screen border-t border-brs3 z-50",
          classList
        )}
        use:simpleToolbar
        style="display: none;"
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
