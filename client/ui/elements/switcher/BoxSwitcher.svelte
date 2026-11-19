<script lang="ts">
  import type {
    ISelectItem,
    ISelectValue
  } from "@21n/ui/elements/select/select.type";
  import Icon from "../Icon.svelte";
  import { bg, cn } from "@21n/ui/environment/presentation";
  import { Size } from "@21n/ui/elements/size.enum";
  import { onMount, tick } from "svelte";
  import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
  import type {
    IContextMenuGroup,
    IContextMenuItem
  } from "@21n/ui/elements/contextMenu/context-menu.type";
  import { resolveSwitcherRow } from "@21n/ui/elements/switcher/switcher-overflow";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import { elementControlShape as shape } from "@21n/ui/environment/control-shape";

  let {
    options,
    selected = $bindable<ISelectValue | undefined>(undefined),
    isTablist = false,
    isIconOnlyMode = false,
    isExpandOnActiveForIcon = false,
    parentBgIndex = 1,
    isTrackFilled = true,
    isAccentColor = false,
    size = Size.sm,
    isActiveIndicatorOnTop = false,
    isOverflowToMenu = false,
    overflowWidth = undefined,
    overflowTrailing = undefined,
    isTrailingInMenu = $bindable(false),
    onSelect = undefined
  }: {
    options: ISelectItem[];
    selected?: ISelectValue | undefined;
    isTablist?: boolean;
    isIconOnlyMode?: boolean;
    isExpandOnActiveForIcon?: boolean;
    parentBgIndex?: number;
    isTrackFilled?: boolean;
    isAccentColor?: boolean;
    size?: Size.sm | Size.md;
    isActiveIndicatorOnTop?: boolean;
    /**
     * Moves the options that do not fit the available width into a "More"
     * menu, keeping the selected option in the row.
     */
    isOverflowToMenu?: boolean;
    /**
     * Width the switcher may use, when the surrounding layout knows it. The
     * switcher then takes only the width its shown options need; without it
     * the switcher measures the room it is given.
     */
    overflowWidth?: number | undefined;
    /**
     * Controls the surrounding layout shows after the switcher that move into
     * the "More" menu as the last step, when even the selected option without
     * its label and More do not fit beside them: their width with the gap
     * before them, and the menu entry that stands for them, which ends the
     * menu. `overflowWidth` then includes the room they take while they show.
     */
    overflowTrailing?:
      | { width: number; menuItem: IContextMenuItem }
      | undefined;
    /**
     * Whether the trailing controls are in the "More" menu; the surrounding
     * layout hides them while it is true.
     */
    isTrailingInMenu?: boolean;
    onSelect?: ((event: CustomEvent<any>) => void) | undefined;
  } = $props();
  $effect(() => {
    if (selected === undefined) selected = options[0]?.value;
  });

  let containerWidth = $state(0);
  const framedTrackWidth = $derived(
    $shape.isFramed ? 8 + 4 * Math.max(options.length - 1, 0) : 0
  );

  function emitSelect(nextSelected: ISelectValue) {
    const selectEvent = new CustomEvent<any>("select", {
      detail: nextSelected
    });
    onSelect?.(selectEvent);
  }

  let overflowRootEl = $state<HTMLDivElement | undefined>();
  let measureEl = $state<HTMLDivElement | undefined>();
  let availableWidth = $state(0);
  let fullWidth = $state(0);
  let optionWidths = $state<number[]>([]);
  let moreWidth = $state(0);
  let activeCompactWidth = $state<number | undefined>(undefined);
  let trackGap = $state(0);
  let trackPadding = $state(0);

  /** Whether an option shows an icon, so it can show without its label. */
  function hasRenderedIcon(option: ISelectItem | undefined) {
    return typeof option?.icon === "string" && option.icon !== "";
  }

  const activeOption = $derived(
    options.find((option) => option.value === selected)
  );
  const budgetWidth = $derived(overflowWidth ?? availableWidth);
  const overflow = $derived.by(() => {
    const all = {
      visible: options.map((_, index) => index),
      isActiveCompact: false,
      isTrailingInMenu: false
    };
    if (!isOverflowToMenu || optionWidths.length !== options.length) return all;
    if (overflowWidth === undefined && availableWidth <= 0) return all;
    return resolveSwitcherRow({
      widths: optionWidths,
      activeIndex: options.findIndex((option) => option.value === selected),
      available: budgetWidth,
      moreWidth,
      gap: trackGap,
      padding: trackPadding,
      activeCompactWidth: hasRenderedIcon(activeOption)
        ? activeCompactWidth
        : undefined,
      trailingWidth: overflowTrailing?.width
    });
  });
  $effect(() => {
    isTrailingInMenu = overflow.isTrailingInMenu;
  });
  const visibleIndexes = $derived(overflow.visible);
  const isActiveLabelHidden = $derived(overflow.isActiveCompact);
  const visibleOptions = $derived(
    visibleIndexes.map((index) => options[index])
  );
  const hiddenOptions = $derived(
    options.filter((_, index) => !visibleIndexes.includes(index))
  );
  const trailingMenuItem = $derived(
    overflow.isTrailingInMenu ? overflowTrailing?.menuItem : undefined
  );
  /** Entries of the More menu: the hidden options and the trailing entry. */
  const moreCount = $derived(hiddenOptions.length + (trailingMenuItem ? 1 : 0));
  /**
   * The most entries More can take (the selected option never moves into it).
   * The measuring copy shows this count, so More's measured width does not
   * depend on the row it helps to decide.
   */
  const maxMoreCount = $derived(
    options.length - 1 + (overflowTrailing ? 1 : 0)
  );

  function measureOptions() {
    if (!measureEl) return;
    const track = measureEl.querySelector<HTMLElement>("[data-switcher-track]");
    if (!track) return;
    const style = getComputedStyle(track);
    trackGap = parseFloat(style.columnGap) || 0;
    trackPadding =
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0);
    optionWidths = Array.from(
      track.querySelectorAll<HTMLElement>("[data-switcher-option]")
    ).map((element) => element.getBoundingClientRect().width);
    moreWidth =
      track
        .querySelector<HTMLElement>("[data-switcher-more]")
        ?.getBoundingClientRect().width ?? 0;
    activeCompactWidth = track
      .querySelector<HTMLElement>("[data-switcher-compact]")
      ?.getBoundingClientRect().width;
    fullWidth = Math.ceil(
      trackPadding +
        optionWidths.reduce((sum, width) => sum + width, 0) +
        trackGap * Math.max(0, optionWidths.length - 1)
    );
  }

  $effect(() => {
    if (!isOverflowToMenu || !overflowRootEl) return;
    const root = overflowRootEl;
    const observer = new ResizeObserver(() => {
      availableWidth = root.clientWidth;
    });
    observer.observe(root);
    availableWidth = root.clientWidth;
    return () => observer.disconnect();
  });

  /**
   * Measures the options once the measuring copy for these values has
   * rendered. Taking them as arguments makes the calling effect re-run when
   * they change; a bare read such as `void options` is dropped when the
   * TypeScript is compiled, so the effect would never re-run.
   */
  function measureOptionsAfterRender(..._changed: unknown[]) {
    void tick().then(measureOptions);
  }

  $effect(() => {
    if (!isOverflowToMenu) return;
    measureOptionsAfterRender(options, selected, $shape, size);
  });

  $effect(() => {
    if (!isOverflowToMenu || !measureEl) return;
    const observer = new ResizeObserver(() => measureOptions());
    observer.observe(measureEl);
    return () => observer.disconnect();
  });

  function resolveMoreMenu(): IContextMenuGroup[] {
    const groups: IContextMenuGroup[] = [];
    if (hiddenOptions.length > 0)
      groups.push({
        group: "more",
        items: hiddenOptions.map((option) => ({
          ...option,
          callback: async () => {
            selected = option.value;
            emitSelect(option.value);
          }
        }))
      });
    if (trailingMenuItem)
      groups.push({ group: "trailing", items: [trailingMenuItem] });
    return groups;
  }

  onMount(() => {
    if (isOverflowToMenu) return;
    if (isExpandOnActiveForIcon) {
      const tempDiv = document.createElement("div");
      tempDiv.style.cssText =
        "position:absolute;visibility:hidden;white-space:nowrap";
      tempDiv.className = "text-b2";
      document.body.appendChild(tempDiv);

      const iconWidth = size === Size.sm ? 20 : 24;
      const padding = size === Size.sm ? 24 : 32;
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

{#snippet moreContent(count: number)}
  <span class="flex items-center gap-1 text-b2 whitespace-nowrap">
    <span>+{Math.max(count, 1)}</span>
    <Icon icon="chevron-down" size={Size.xs} />
  </span>
{/snippet}

{#snippet optionButtons(
  items: ISelectItem[],
  isMeasure: boolean,
  isCompactMeasure = false
)}
  {#each items as option (option.value)}
    {@const isSelected = selected === option.value}
    <button
      type="button"
      tabindex={isMeasure ? -1 : undefined}
      data-switcher-option={isMeasure && !isCompactMeasure ? "" : undefined}
      data-switcher-compact={isCompactMeasure ? "" : undefined}
      role={isTablist && !isMeasure ? "tab" : undefined}
      aria-selected={isTablist ? isSelected : undefined}
      aria-label={option.label}
      class={cn(
        "flex items-center justify-center gap-1 text-b2 transition-all duration-300",
        {
          "px-3": size === Size.sm,
          "px-4": size === Size.md
        },
        !$shape.isFramed && {
          "h-full": true,
          "border-t": isActiveIndicatorOnTop,
          "border-b": !isActiveIndicatorOnTop,
          "border-transparent hover:border-brs3 text-fgs3": !isSelected,
          "border-fgs2": isSelected && !isAccentColor,
          "border-aps1 text-aps1": isSelected && isAccentColor,
          [`${bg(parentBgIndex)}`]: isSelected,
          [`hover:${bg(parentBgIndex)}-striped`]: !isSelected
        },
        $shape.isFramed && {
          [`h-8 ${$shape.radiusClass}`]: true,
          "text-fgs3 hover:text-fgs1 hover:bg-bgs2-striped": !isSelected,
          "bg-bgs1 shadow-sm": isSelected,
          "text-fgs1": isSelected && !isAccentColor,
          "text-aps1": isSelected && isAccentColor
        }
      )}
      onclick={() => {
        selected = option.value;
        emitSelect(option.value);
      }}
      use:tooltip={{
        text: option.label,
        delay: isSelected || !isExpandOnActiveForIcon ? 1000 : 200
      }}
    >
      {#if option.icon && typeof option.icon === "string"}
        <Icon
          icon={option.icon}
          {size}
          isFilled={isSelected}
          class={cn({
            "text-fgs1": isSelected && !isAccentColor,
            "text-aps1": isSelected && isAccentColor,
            "text-fgs2": !isSelected
          })}
        />
      {/if}
      {#if !isIconOnlyMode && option.label && (!isExpandOnActiveForIcon || selected === option.value) && !(hasRenderedIcon(option) && (isCompactMeasure || (isSelected && isActiveLabelHidden && !isMeasure)))}
        <span class="whitespace-nowrap">
          {option.label}
        </span>
      {/if}
    </button>
  {/each}
{/snippet}

{#snippet track(items: ISelectItem[], isMeasure: boolean)}
  {@const trackClass = cn("grid grid-flow-col", {
    "h-full": !$shape.isFramed,
    "auto-cols-max w-full":
      !$shape.isFramed && (!isExpandOnActiveForIcon || isIconOnlyMode),
    "auto-cols-max":
      $shape.isFramed && (!isExpandOnActiveForIcon || isIconOnlyMode),
    "items-center gap-1 p-1": $shape.isFramed,
    [bg(parentBgIndex + 1)]: $shape.isFramed && isTrackFilled,
    "rounded-full": $shape.isRounded,
    "rounded-lg": $shape.isFramed && !$shape.isRounded
  })}
  {#if isOverflowToMenu && !isMeasure}
    <!--
      More sits beside the tablist, not inside it, so the tablist owns only
      tabs and the arrow keys reach the More menu once it is open.
    -->
    <div class={trackClass}>
      <div
        role={isTablist ? "tablist" : undefined}
        class={cn("grid grid-flow-col auto-cols-max", {
          "h-full": !$shape.isFramed,
          "items-center gap-1": $shape.isFramed
        })}
      >
        {@render optionButtons(items, false)}
      </div>
      {#if moreCount > 0}
        <ContextMenuAction
          id="switcherMore"
          testId="switcher-more"
          tooltip={`+${moreCount} more`}
          menuResolver={resolveMoreMenu}
          {size}
          actionSize={size}
          {parentBgIndex}
          class={cn(
            "flex items-center justify-center text-fgs2 hover:text-fgs1",
            {
              "px-3": size === Size.sm,
              "px-4": size === Size.md,
              "h-full": !$shape.isFramed,
              [`h-8 ${$shape.radiusClass} hover:bg-bgs2-striped`]:
                $shape.isFramed
            }
          )}
        >
          {#snippet children()}
            {@render moreContent(moreCount)}
          {/snippet}
        </ContextMenuAction>
      {/if}
    </div>
  {:else}
    <div
      role={isTablist && !isMeasure ? "tablist" : undefined}
      data-switcher-track={isMeasure ? "" : undefined}
      class={trackClass}
      style:width={!isOverflowToMenu &&
      !isIconOnlyMode &&
      isExpandOnActiveForIcon &&
      containerWidth > 0
        ? `${containerWidth + framedTrackWidth}px`
        : undefined}
      style:grid-template-columns={isExpandOnActiveForIcon && !isOverflowToMenu
        ? items
            .map((opt) => (opt.value === selected ? "1fr" : "auto"))
            .join(" ")
        : undefined}
    >
      {@render optionButtons(items, isMeasure)}
      {#if isMeasure && activeOption && hasRenderedIcon(activeOption)}
        {@render optionButtons([activeOption], true, true)}
      {/if}
      {#if isMeasure}
        <span
          data-switcher-more
          class={cn("flex items-center justify-center", {
            "px-3": size === Size.sm,
            "px-4": size === Size.md,
            "h-8": $shape.isFramed
          })}
        >
          {@render moreContent(maxMoreCount)}
        </span>
      {/if}
    </div>
  {/if}
{/snippet}

{#if isOverflowToMenu}
  <div
    bind:this={overflowRootEl}
    class={cn("relative flex items-center h-full", {
      "min-w-0 shrink": overflowWidth === undefined,
      "shrink-0": overflowWidth !== undefined
    })}
    style:width={overflowWidth === undefined && fullWidth > 0
      ? `${fullWidth}px`
      : undefined}
  >
    <div
      aria-hidden="true"
      class="absolute left-0 top-0 w-0 h-full overflow-hidden invisible pointer-events-none"
    >
      <div bind:this={measureEl} class="flex items-center h-full w-max">
        {@render track(options, true)}
      </div>
    </div>
    {@render track(visibleOptions, false)}
  </div>
{:else if $shape.isFramed}
  <div class="flex items-center h-full shrink-0">
    {@render track(options, false)}
  </div>
{:else}
  {@render track(options, false)}
{/if}
