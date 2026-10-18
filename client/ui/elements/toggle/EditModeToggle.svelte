<script lang="ts">
  import { Size } from "@21n/ui/elements/size.enum";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import Switch from "@21n/ui/elements/toggle/Switch.svelte";
  let {
    value = $bindable(false),
    isReadModeVariant = false
  }: {
    value?: boolean;
    isReadModeVariant?: boolean;
  } = $props();
</script>

{#if isReadModeVariant}
  <Button
    tooltip="Toggle read mode"
    icon="book-open"
    size={Size.sm}
    onclick={() => (value = !value)}
  />
{:else}
  <div class="rounded-full flex items-center gap-2 px-3 py-1">
    <span class="text-fgs3 text-b2"> edit: </span>
    <Switch
      on={value}
      size={Size.sm}
      ariaLabel="Edit mode"
      onChange={(event) => (value = event.detail)}
    />
  </div>
{/if}
