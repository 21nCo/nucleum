<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import { mdToolbar, simpleToolbar } from "@21n/elements/keyboardToolbar/keyboardToolbar.action";
  import { cn } from "@21n/utils/ui.utils";
  import { fly } from "svelte/transition";
  let {
    class: classList = "",
    isMdToolbar = false,
    offset = 0,
    isPreventDefaultOnKeyboardClose = false,
    zIndex = 70,
    children = undefined
  }: {
    class?: string;
    isMdToolbar?: boolean;
    offset?: number;
    isPreventDefaultOnKeyboardClose?: boolean;
    zIndex?: number;
    children?: Snippet | undefined;
  } = $props();
  const dev_enableKeyboardToolbar = false;
  let ref: HTMLElement;
  let portal: HTMLElement;

  export function close() {
    const allToolbars = document.querySelectorAll(".toolbar");
    allToolbars.forEach((toolbar) => {
      (toolbar as HTMLElement).style.display = "none";
    });
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  onMount(() => {
    portal = document.createElement("div");
    portal.className = "toolbar-container";
    document.getElementById("toolbars")?.appendChild(portal);
    if (ref) portal?.appendChild(ref);
  });

  onDestroy(() => {
    document.getElementById("toolbars")?.removeChild(portal);
  });
</script>

{#if dev_enableKeyboardToolbar}
  <div class="toolbar-placeholder" in:fly={{ y: 50 }}>
    <div bind:this={ref}>
      {#if isMdToolbar}
        <div
          class={cn(
            "mdtoolbar toolbar fixed left-0 bottom-0 w-screen border-t border-brs3",
            classList,
            `z-[${zIndex}]`
          )}
          use:mdToolbar={{
            offset,
            isPreventDefaultOnKeyboardClose
          }}
          style="display: none; z-index: {zIndex};"
        >
          {@render children?.()}
        </div>
      {:else}
        <div
          class={cn(
            "toolbar fixed left-0 bottom-0 w-screen border-t border-brs3",
            classList,
            `z-[${zIndex}]`
          )}
          use:simpleToolbar
          style="display: none; z-index: {zIndex};"
        >
          {@render children?.()}
        </div>
      {/if}
    </div>
  </div>

  <style>
    .toolbar-placeholder {
      display: none;
    }
  </style>
{/if}
