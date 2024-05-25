<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  export let item: string;
  export let isActive: boolean = false;
  export let isShowLabel: boolean = false;
  let component = appStore.resolveComponent(item);
</script>

<div class="flex items-center gap-1">
  <Button
    icon={component?.icon}
    tooltip={component?.label}
    isStayActive={isActive}
    on:click
    size={isShowLabel ? Size.sm : Size.md}
  />
  {#if isShowLabel}
    <span class="text-b2 text-fgs2">
      {component?.label}
    </span>
  {/if}
</div>
