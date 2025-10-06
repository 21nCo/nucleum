<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import ShortcutText from "../text/ShortcutText.svelte";
  import type { IKeyboardShortcut } from "$lib/client/components/shortcuts/shortcut.type";
  import { fade } from "svelte/transition";

  export let tooltip: string;
  export let shortcut: string | IKeyboardShortcut | undefined = undefined;
  export let size: Size.sm | Size.md = Size.md;
  export let parentBgIndex: number = 1;
</script>

<div
  class="flex items-center gap-2 px-3 py-1.5 text-b3 bg-fgs2 text-bgs1"
  in:fade={{ duration: 300 }}
>
  <div class="whitespace-nowrap">
    {tooltip}
  </div>
  {#if shortcut}
    <div class="border border-brs3 rounded-md">
      <ShortcutText {shortcut} {size} {parentBgIndex} isPlainText={true} />
    </div>
  {/if}
</div>
