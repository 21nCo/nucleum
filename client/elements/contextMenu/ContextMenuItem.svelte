<script lang="ts">
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { IContextMenuItem } from "$lib/client/types/select.type";
  export let item: IContextMenuItem;
  function isRedAccent(item: IContextMenuItem) {
    return item.value.toString().toLowerCase() === "delete";
  }
</script>

<span class="flex items-center gap-2.5 flex-1 min-w-0">
  {#if item.icon && typeof item.icon === "string"}
    <Icon
      size={Size.sm}
      icon={item.icon}
      class={cn({
        "stroke-ars1": isRedAccent(item)
      })}
    />
  {/if}
  <span
    class={cn("min-w-fit whitespace-nowrap", {
      "text-ars1": isRedAccent(item)
    })}>{item.label ?? properCase(enumToString(item.value.toString()))}</span
  >
</span>
{#if item.secondStepComponent || item.action}
  <Icon icon="chevright" size={Size.sm} />
{/if}
