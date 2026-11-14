<script lang="ts">
  import type { IContextMenuOptionGroup } from "@21n/ui/elements/contextMenu/context-menu.type";
  import type { ISelectValue } from "@21n/ui/elements/select/select.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import ContextMenuOptionList from "@21n/ui/elements/contextMenu/ContextMenuOptionList.svelte";
  import ContextMenuItemWithSecondary from "@21n/ui/elements/contextMenu/ContextMenuItemWithSecondary.svelte";
  import {
    ContextMenuOptionLayout,
    handleContextMenuOptionKey,
    isContextMenuOptionEnabled,
    resolveContextMenuOptionLayout,
    resolveContextMenuOptionTabStop
  } from "@21n/ui/elements/contextMenu/context-menu-option";

  let {
    option,
    size = Size.md
  }: {
    option: IContextMenuOptionGroup;
    size?: Size.sm | Size.md | Size.lg;
  } = $props();

  let current = $state<ISelectValue | undefined>(undefined);

  $effect.pre(() => {
    current = option.value;
  });

  const layout = $derived(resolveContextMenuOptionLayout(option.options));
  const tabStop = $derived(
    resolveContextMenuOptionTabStop(option.options, current)
  );
  const currentLabel = $derived(
    option.options.find((item) => item.value === current)?.label ??
      (current === undefined ? "" : String(current))
  );

  function change(value: ISelectValue) {
    if (value === current || !isContextMenuOptionEnabled(option.options, value))
      return;
    current = value;
    option.onChange(value);
  }
</script>

<div data-testid="context-menu-option-group" data-layout={layout}>
  {#if layout === ContextMenuOptionLayout.SEGMENTED}
    <div
      class="flex items-center justify-between gap-3 pl-2 pr-1 py-1"
      role="radiogroup"
      tabindex="-1"
      aria-label={option.label}
      onkeydown={(event) =>
        handleContextMenuOptionKey(event, option.options, change)}
    >
      <span
        class="min-w-0 truncate text-fgs2"
        title={option.label}
        data-testid="context-menu-option-label"
      >
        {option.label}
      </span>
      <div class="flex shrink-0 items-center gap-0.5 p-0.5 rounded-md bg-bgs4">
        {#each option.options as item, index (item.value)}
          {@const isActive = item.value === current}
          <button
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={item.isDisabled}
            tabindex={index === tabStop ? 0 : -1}
            data-option-value={item.value}
            class={cn("px-2.5 py-1 rounded text-b3 whitespace-nowrap", {
              "bg-bgs1 text-fgs1 font-medium shadow-sm ring-1 ring-brs3": isActive,
              "text-fgs2 hover:text-fgs1": !isActive && !item.isDisabled,
              "text-fgs4 cursor-not-allowed": item.isDisabled
            })}
            onclick={() => change(item.value)}
          >
            {item.label ?? item.value}
          </button>
        {/each}
      </div>
    </div>
  {:else if layout === ContextMenuOptionLayout.RADIO}
    <ContextMenuOptionList
      label={option.label}
      options={option.options}
      value={current}
      {size}
      onChange={change}
    />
  {:else}
    <ContextMenuItemWithSecondary
      {size}
      item={{
        value: `option-${option.label}`,
        label: `${option.label}: ${currentLabel}`,
        secondStepComponent: {
          component: ContextMenuOptionList,
          props: {
            label: option.label,
            options: option.options,
            resolveValue: () => current,
            isSubmenu: true,
            size,
            onChange: change
          }
        }
      }}
    />
  {/if}
</div>
