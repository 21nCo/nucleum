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
  import type { IContextMenuGroup } from "@21n/ui/elements/contextMenu/context-menu.type";
  import { resolveSwitcherVisibleOptions } from "@21n/ui/elements/switcher/switcher-overflow";
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
  let trackGap = $state(0);
  let trackPadding = $state(0);

  const visibleIndexes = $derived.by(() => {
    if (!isOverflowToMenu || optionWidths.length !== options.length)
      return options.map((_, index) => index);
    if (availableWidth <= 0) return options.map((_, index) => index);
    return resolveSwitcherVisibleOptions({
      widths: optionWidths,
      activeIndex: options.findIndex((option) => option.value === selected),
      available: availableWidth,
      moreWidth,
      gap: trackGap,
      padding: trackPadding
    });
  });
  const isActiveLabelHidden = $derived.by(() => {
    if (!isOverflowToMenu || visibleIndexes.length !== 1) return false;
    if (visibleIndexes.length === options.length) return false;
    const active = visibleIndexes[0];
    return (
      trackPadding + optionWidths[active] + trackGap + moreWidth >
      availableWidth
    );
  });
  const visibleOptions = $derived(
    visibleIndexes.map((index) => options[index])
  );
  const hiddenOptions = $derived(
    options.filter((_, index) => !visibleIndexes.includes(index))
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

  $effect(() => {
    if (!isOverflowToMenu) return;
    void options;
    void selected;
    void $shape;
    void size;
    tick().then(measureOptions);
  });

  function resolveMoreMenu(): IContextMenuGroup[] {
    return [
      {
        group: "more",
        items: hiddenOptions.map((option) => ({
          ...option,
          callback: async () => {
            selected = option.value;
            emitSelect(option.value);
          }
        }))
      }
    ];
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

{#snippet moreContent()}
  <span class="flex items-center gap-0.5">
    <Icon icon="more-outline-horizontal" {size} />
    <Icon icon="chevron-down" size={Size.xs} />
  </span>
{/snippet}

{#snippet track(items: ISelectItem[], isMeasure: boolean)}
  <div
    role={isTablist && !isMeasure ? "tablist" : undefined}
    data-switcher-track={isMeasure ? "" : undefined}
    class={cn("grid grid-flow-col", {
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
    style:width={!isOverflowToMenu &&
    !isIconOnlyMode &&
    isExpandOnActiveForIcon &&
    containerWidth > 0
      ? `${containerWidth + framedTrackWidth}px`
      : undefined}
    style:grid-template-columns={isExpandOnActiveForIcon && !isOverflowToMenu
      ? items.map((opt) => (opt.value === selected ? "1fr" : "auto")).join(" ")
      : undefined}
  >
    {#each items as option (option.value)}
      {@const isSelected = selected === option.value}
      <button
        type="button"
        tabindex={isMeasure ? -1 : undefined}
        data-switcher-option={isMeasure ? "" : undefined}
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
        {#if !isIconOnlyMode && option.label && (!isExpandOnActiveForIcon || selected === option.value) && !(isSelected && isActiveLabelHidden && !isMeasure && option.icon)}
          <span class="whitespace-nowrap">
            {option.label}
          </span>
        {/if}
      </button>
    {/each}
    {#if isMeasure}
      <span
        data-switcher-more
        class={cn("flex items-center justify-center", {
          "px-3": size === Size.sm,
          "px-4": size === Size.md,
          "h-8": $shape.isFramed
        })}
      >
        {@render moreContent()}
      </span>
    {:else if isOverflowToMenu && hiddenOptions.length > 0}
      <ContextMenuAction
        id="switcherMore"
        testId="switcher-more"
        tooltip="More"
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
            [`h-8 ${$shape.radiusClass} hover:bg-bgs2-striped`]: $shape.isFramed
          }
        )}
      >
        {#snippet children()}
          {@render moreContent()}
        {/snippet}
      </ContextMenuAction>
    {/if}
  </div>
{/snippet}

{#if isOverflowToMenu}
  <div
    bind:this={overflowRootEl}
    class="relative flex items-center h-full min-w-0 shrink"
    style:width={fullWidth > 0 ? `${fullWidth}px` : undefined}
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
