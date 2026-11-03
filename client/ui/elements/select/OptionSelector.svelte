<script lang="ts">
  import { Size } from "@21n/ui/elements/size.enum";
  import OptionSelectorItem from "@21n/ui/elements/select/OptionSelectorItem.svelte";
  import FormControlLabelWrapper from "@21n/ui/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import {
    OptionSelectorStyle,
    type ISelectItem,
    type ISelectValue
  } from "@21n/ui/elements/select/select.type";
  import { cn } from "@21n/ui/environment/presentation";
  import type { InputLabel } from "@21n/ui/elements/input/input.type";
  import { elementPlatform as context } from "@21n/ui/environment/element-environment.store";
  import { elementControlShape as shape } from "@21n/ui/environment/control-shape";
  let {
    options,
    labelProps = undefined,
    selected = $bindable<ISelectValue | undefined>(),
    parentBgIndex = 1,
    size = Size.md,
    style = OptionSelectorStyle.OUTLINE,
    iconOrientation = Orientation.Horizontal,
    isPreventWrap = false,
    isShowExpandFeedbackOnActive = false,
    isExpandOnActiveForIcon = false,
    onSelect = undefined
  }: {
    options: ISelectItem[];
    labelProps?: InputLabel | undefined;
    selected?: ISelectValue | undefined;
    parentBgIndex?: number;
    size?: Size.lg | Size.md | Size.sm;
    style?: OptionSelectorStyle;
    iconOrientation?: Orientation;
    isPreventWrap?: boolean;
    isShowExpandFeedbackOnActive?: boolean;
    isExpandOnActiveForIcon?: boolean;
    onSelect?: ((event: CustomEvent<any>) => void) | undefined;
  } = $props();
  const isRounded = $derived($shape.isRounded);
  const isFramed = $derived($shape.isFramed);
  const classList = "flex w-full";
  $effect(() => {
    if (selected === undefined) selected = options[0]?.value;
  });

  function emitSelect(nextSelected: ISelectValue) {
    const selectEvent = new CustomEvent<any>("select", {
      detail: nextSelected
    });
    onSelect?.(selectEvent);
  }
</script>

<FormControlLabelWrapper props={labelProps}
  ><div
    class={cn({
      "relative w-full": labelProps?.orientation === Orientation.Vertical,
      "max-w-[16rem] grow": labelProps?.orientation === Orientation.Horizontal,
      "w-full overflow-auto": isPreventWrap
    })}
  >
    <div
      class={cn(classList, {
        "border border-brs3":
          style === OptionSelectorStyle.TRAIN ||
          style === OptionSelectorStyle.ICON,
        "rounded-lg":
          (style === OptionSelectorStyle.TRAIN ||
            style === OptionSelectorStyle.ICON) &&
          !isRounded,
        "rounded-full":
          (style === OptionSelectorStyle.TRAIN ||
            style === OptionSelectorStyle.ICON) &&
          isRounded,
        "!border-transparent": isFramed,
        "flex-wrap overflow-y-auto":
          style === OptionSelectorStyle.OUTLINE && !isPreventWrap,
        "overflow-x-auto": isPreventWrap,
        "py-0.5":
          isPreventWrap &&
          $context.isEmbed &&
          ($context.os === "IOS" || $context.os === "MACOS"),
        "gap-6": style === OptionSelectorStyle.OUTLINE && size === Size.lg,
        "gap-4": style === OptionSelectorStyle.OUTLINE && size === Size.md,
        "gap-2":
          (style === OptionSelectorStyle.OUTLINE && size === Size.sm) ||
          (style === OptionSelectorStyle.OUTLINE &&
            (size === Size.md || size === Size.lg)),
        "gap-1.5": style === OptionSelectorStyle.ICON && size === Size.sm,
        grow: style === OptionSelectorStyle.CHECK_CIRCLE,
        "justify-start gap-8":
          style === OptionSelectorStyle.CHECK_CIRCLE &&
          labelProps?.orientation === Orientation.Vertical,
        "justify-around gap-2":
          style === OptionSelectorStyle.CHECK_CIRCLE &&
          labelProps?.orientation === Orientation.Horizontal
      })}
    >
      {#each options as item, index}
        <OptionSelectorItem
          {item}
          {size}
          {style}
          {parentBgIndex}
          {isShowExpandFeedbackOnActive}
          {isExpandOnActiveForIcon}
          {iconOrientation}
          isActive={selected === item.value}
          onclick={() => {
            if (item.isDisabled) return;
            selected = item.value;
            emitSelect(item.value);
          }}
        />
      {/each}
    </div>
  </div></FormControlLabelWrapper
>
