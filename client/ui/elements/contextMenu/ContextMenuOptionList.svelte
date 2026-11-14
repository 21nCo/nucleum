<script lang="ts">
  import type {
    ISelectItem,
    ISelectValue
  } from "@21n/ui/elements/select/select.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { POPOVER_KEEP_OPEN_ATTRIBUTE } from "@21n/ui/actions/popover.type";

  let {
    label = undefined,
    options,
    value = undefined,
    resolveValue = undefined,
    isSubmenu = false,
    size = Size.md,
    onChange
  }: {
    /** Caption shown above the options; omitted inside a submenu. */
    label?: string | undefined;
    options: ISelectItem[];
    value?: ISelectValue | undefined;
    /**
     * Reads the current value live. A submenu popover mounts its props once,
     * so it passes a getter instead of a value snapshot.
     */
    resolveValue?: (() => ISelectValue | undefined) | undefined;
    /** Keeps the parent menu open when an option in this submenu is picked. */
    isSubmenu?: boolean;
    size?: Size.sm | Size.md | Size.lg;
    onChange: (value: ISelectValue) => void;
  } = $props();

  const current = $derived(resolveValue ? resolveValue() : value);
</script>

<div
  class="flex flex-col"
  role="group"
  aria-label={label}
  data-testid="context-menu-option-list"
  {...isSubmenu ? { [POPOVER_KEEP_OPEN_ATTRIBUTE]: "" } : {}}
>
  {#if label}
    <div class="px-2 pt-1 pb-0.5 text-b3 font-medium text-fgs3">{label}</div>
  {/if}
  {#each options as option (option.value)}
    {@const isActive = option.value === current}
    <button
      type="button"
      role="menuitemradio"
      aria-checked={isActive}
      data-option-value={option.value}
      class={cn("flex items-center gap-2.5 w-full rounded-md text-left", {
        "p-1.5": size === Size.sm,
        "p-2": size === Size.md,
        "px-3 py-2": size === Size.lg,
        "bg-bgs3 text-fgs1 font-medium": isActive,
        "text-fgs2 hover:bg-bgs3": !isActive
      })}
      onclick={() => {
        if (!isActive) onChange(option.value);
      }}
    >
      <span
        class={cn(
          "flex items-center justify-center w-3.5 h-3.5 shrink-0 rounded-full border",
          {
            "border-aps1": isActive,
            "border-brs4": !isActive
          }
        )}
      >
        {#if isActive}
          <span class="w-1.5 h-1.5 rounded-full bg-aps1"></span>
        {/if}
      </span>
      {#if typeof option.icon === "string" && option.icon}
        <Icon icon={option.icon} size={Size.sm} />
      {/if}
      <span class="truncate">{option.label ?? option.value}</span>
    </button>
  {/each}
</div>
