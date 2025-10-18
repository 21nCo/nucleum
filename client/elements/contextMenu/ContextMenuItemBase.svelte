<script lang="ts">
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import {
    ContextMenuType,
    type IContextMenuItem
  } from "$lib/client/types/select.type";
  import Badge from "../text/Badge.svelte";
  import Switch from "../toggle/Switch.svelte";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  export let item: IContextMenuItem;
  export let checked: boolean = item.initialValue ?? false;
  export let isRedAccent: boolean = false;

  export function toggle() {
    if (item.type === ContextMenuType.SWITCH) {
      checked = !checked;
      dispatch("change", checked);
    }
  }
  onMount(() => {});
</script>

<span class="flex items-center gap-2.5 flex-1 min-w-0">
  {#if item.icon && typeof item.icon === "string"}
    <Icon
      size={Size.sm}
      icon={item.icon}
      class={cn({
        "stroke-ars1": isRedAccent
      })}
    />
  {/if}
  <span
    class={cn("min-w-fit whitespace-nowrap", {
      "text-ars1": isRedAccent
    })}>{item.label ?? properCase(enumToString(item.value.toString()))}</span
  >
</span>
{#if item.secondStepComponent || item.action}
  <Icon icon="chevron-right" size={Size.sm} />
{/if}
{#if item.badge && !item.action && !item.secondStepComponent}
  <Badge text={item.badge} />
{/if}
{#if item.type === ContextMenuType.SWITCH}
  <Switch bind:on={checked} size={Size.sm} on:change />
{/if}
