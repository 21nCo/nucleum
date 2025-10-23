<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import { cn } from "@21n/utils/ui.utils";
  export let mode: number = 0;
  export let isActive: boolean = false;
</script>

<button
  class="flex items-center justify-center gap-2 {isActive
    ? ' rounded-b-md text-aps1'
    : ' rounded-b-md text-fgs3'}"
  style={mode == 0
    ? "border-bottom-right-radius: 0rem;"
    : "border-bottom-left-radius: 0rem;"}
  on:click
>
  {#if mode === 0}
    <Icon
      icon="folder"
      class={cn({
        "stroke-aps1": isActive,
        "stroke-fgs3": !isActive
      })}
    />
    Presets
  {:else}
    <Icon
      icon="clock"
      class={cn({
        "stroke-aps1": isActive,
        "stroke-fgs3": !isActive
      })}
    />
    Custom
  {/if}
</button>
