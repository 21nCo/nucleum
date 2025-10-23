<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { abg, cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
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
    <Icon isAccentBgContext={isActive} {icon} size={Size.sm} />
  {/if}
  {label}
</button>
