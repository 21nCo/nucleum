<script lang="ts">
  import type { ISelectItem, ISelectValue } from "@21n/types/select.type";
  import Icon from "../Icon.svelte";
  import { bg, cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import { Size } from "@21n/types/size.enum";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { tooltip } from "@21n/actions/popover.action";
  export let options: ISelectItem[];
  export let selected: ISelectValue | undefined = undefined;
  export let isExpandOnActiveForIcon = false;
  export let parentBgIndex: number = 1;
  if (selected === undefined) selected = options[0]?.value;
  const dispatch = createEventDispatcher();

  let containerWidth = 0;
  let containerEl: HTMLDivElement;

  onMount(() => {
    if (isExpandOnActiveForIcon && containerEl) {
      const tempDiv = document.createElement("div");
      tempDiv.style.cssText =
        "position:absolute;visibility:hidden;white-space:nowrap";
      tempDiv.className = "text-b2";
      document.body.appendChild(tempDiv);

      const iconWidth = 20;
      const padding = 24;
      const iconOnlyWidth = iconWidth + padding;
      const inactiveCount = options.length - 1;

      let maxLabelWidth = 0;
      options.forEach((opt) => {
        if (opt.label) {
          tempDiv.textContent = opt.label;
          maxLabelWidth = Math.max(maxLabelWidth, tempDiv.offsetWidth);
        }
      });

      containerWidth =
        inactiveCount * iconOnlyWidth +
        (iconWidth + maxLabelWidth + padding + 4);
      document.body.removeChild(tempDiv);
    }
  });
</script>

<div
  bind:this={containerEl}
  class={cn("grid grid-flow-col h-full", {
    "auto-cols-max w-full": !isExpandOnActiveForIcon
  })}
  style:width={isExpandOnActiveForIcon && containerWidth > 0
    ? `${containerWidth}px`
    : undefined}
  style:grid-template-columns={isExpandOnActiveForIcon
    ? options.map((opt) => (opt.value === selected ? "1fr" : "auto")).join(" ")
    : undefined}
>
  {#each options as option (option.value)}
    {@const isSelected = selected === option.value}
    <button
      class={cn(
        "flex items-center justify-center gap-1 h-full px-3 border-b text-b2",
        {
          "border-transparent hover:border-brs3": !isSelected,
          "border-aps1": isSelected,
          [`${bg(parentBgIndex)}`]: isSelected,
          [`hover:${bg(parentBgIndex)}-striped`]: !isSelected
        }
      )}
      on:click={() => {
        selected = option.value;
        dispatch("select", option.value);
      }}
      use:tooltip={{
        text: option.label,
        delay: isSelected || !isExpandOnActiveForIcon ? 1000 : 200
      }}
    >
      {#if option.icon && typeof option.icon === "string"}
        <Icon
          icon={option.icon}
          size={Size.sm}
          class={cn({
            "text-fgs1": isSelected
          })}
        />
      {/if}
      {#if option.label && (!isExpandOnActiveForIcon || selected === option.value)}
        <span class="whitespace-nowrap" in:fly={{ duration: 200, x: 10 }}>
          {option.label}
        </span>
      {/if}
    </button>
  {/each}
</div>
