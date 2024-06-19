<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Icon from "./Icon.svelte";
  import { IconVariant } from "../types/icon.type";
  import { SelectionItemActiveStyle } from "../types/switcher.enum";
  import { abg, cn } from "../utils/ui.utils";
  export let label: string;
  export let id: string;
  export let icon: string | undefined = "";
  export let isActive: boolean = false;
  const dispatch = createEventDispatcher();

  function handleTagClick(e: any) {
    dispatch("click", { label, id });
  }
</script>

<button
  on:click={handleTagClick}
  class={cn(
    "w-fit flex items-center justify-center gap-1 whitespace-nowrap text-b3 border rounded-md py-1 px-3 transition-all active:scale-105",
    {
      "border-aps1": isActive,
      [abg()]: isActive,
      "border-fgs2": !isActive
    }
  )}
>
  {#if icon}
    <div class="min-w-[1rem] mr-2 flex justify-center items-center w-4 h-4">
      <Icon
        selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        {isActive}
        {icon}
        variant={IconVariant.Outline}
      />
    </div>
  {/if}
  {label}
</button>
