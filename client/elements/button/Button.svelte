<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "../Icon.svelte";
  import { ButtonStyle, ButtonVariant } from "../../types/button.type";
  import InlineLoadingAnimation from "../feedback/animations/InlineLoadingAnimation.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import type { IPopoverRenderBaseParams } from "$lib/client/types/popover.type";
  import HoverableElement from "../HoverableElement.svelte";
  // import { uiStateDerived } from "$lib/client/stores/uiState/uiState.store";
  // import ShortcutText from "../text/ShortcutText.svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import Badge from "../text/Badge.svelte";
  export let parentBgIndex: number = 1;
  export let label: string | undefined = undefined;
  export let className: string = "";
  export { className as class };
  /** button type description to be rendered in stories and code editor tooltips*/
  export let type: "primary" | "secondary" | "danger" | ButtonVariant =
    ButtonVariant.SECONDARY;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isExpandToFullWidth: boolean = false;
  export let style: ButtonStyle = ButtonStyle.DEFAULT;
  export let icon: string | undefined = undefined;
  export let isDisabled: boolean = false;
  export let tooltip: string | undefined = undefined;
  export let isPreventMinWidth: boolean = false;
  export let tooltipOptions: IPopoverRenderBaseParams = {
    placement: Placement.BottomCenter,
    offsetInPx: 4,
    isSpanToTriggerWidth: false,
    isUseAbsolutePositioning: false
  };
  export let isLoading: boolean = false;
  /**
   * Applicable when {@link ButtonStyle.PLAIN} style is choosen
   */
  export let isUnderlined: boolean = false;
  export let id: string = "";
  let buttonRef: any;
  export let isHovering: boolean = false;
  export let shortcut: string | undefined = undefined;
  export let badge: string | undefined = undefined;
  $: isIconOnlyButton = !label && !$$slots.default;
</script>

<HoverableElement
  {id}
  bind:isHovering
  type="button"
  class={cn(
    "relative flex flex-row justify-center items-center rounded-full",
    {
      "w-full": isExpandToFullWidth,
      "opacity-70 cursor-not-allowed hover:opacity-50": isDisabled || isLoading,
      "gap-4 text-base": size === Size.lg,
      "gap-2 text-b2 dp:text-base": size === Size.md,
      "gap-2 text-b3 dp:text-b2": size === Size.sm,
      "gap-1 text-b4 dp:text-b3": size === Size.xs,
      "p-1.5 rounded-md": isIconOnlyButton,
      [bg(parentBgIndex)]:
        isHovering && isIconOnlyButton && style != ButtonStyle.PLAIN,
      "text-fgs2 hover:text-aps1": style === ButtonStyle.PLAIN,
      "underline-dotted hover:underline-dotted-primary":
        style === ButtonStyle.PLAIN && isUnderlined
    },
    style != ButtonStyle.PLAIN &&
      !isPreventMinWidth &&
      !isIconOnlyButton && {
        "min-w-32": size === Size.lg || size === Size.md || size === Size.sm,
        "min-w-fit": size === Size.xs
      },
    style != ButtonStyle.PLAIN &&
      !isIconOnlyButton && {
        "shadow--md": true,
        "h-12 py-4 px-6": size === Size.lg,
        "h-10 py-3 px-5": size === Size.md,
        "h-8 py-2 px-4": size === Size.sm,
        "h-6 py-1 px-2": size === Size.xs
      },
    style === ButtonStyle.DEFAULT &&
      !isIconOnlyButton && [
        {
          "hover:opacity-90 text-abg":
            type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER,
          "bg-aps1": type === ButtonVariant.PRIMARY,
          "bg-ars1": type === ButtonVariant.DANGER,
          "border border-transparent hover:border-brs3":
            type === ButtonVariant.SECONDARY,
          [bg(parentBgIndex)]: type === ButtonVariant.SECONDARY
        }
      ],
    style === ButtonStyle.OUTLINED && [
      {
        border: true,
        "border-aps2 bg-aps3 text-aps1 hover:bg-aps2 hover:border-aps1":
          type === ButtonVariant.PRIMARY,
        "border-brs3 text-fgs2 hover:text-fgs1 hover:bg-bgs2":
          type === ButtonVariant.SECONDARY,
        "border-ars1 text-ars1": type === ButtonVariant.DANGER
      }
    ],
    className
  )}
  on:click
  bind:this={buttonRef}
  {tooltip}
  {tooltipOptions}
  isDisabled={isDisabled || isLoading}
>
  {#if isLoading}
    <InlineLoadingAnimation
      variant={type === ButtonVariant.SECONDARY
        ? "bg-background"
        : "accent-background"}
    />
  {:else}
    {#if icon}
      <Icon
        {icon}
        size={size === Size.xs ? Size.sm : size}
        class={cn({
          "stroke-aps1":
            (style === ButtonStyle.OUTLINED &&
              type === ButtonVariant.PRIMARY) ||
            (isHovering &&
              style === ButtonStyle.PLAIN &&
              type === ButtonVariant.SECONDARY),
          "stroke-ars1":
            style === ButtonStyle.OUTLINED && type === ButtonVariant.DANGER,
          "stroke-fgs2": type === ButtonVariant.SECONDARY,
          "stroke-abg":
            style === ButtonStyle.DEFAULT &&
            (type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER),
          "stroke-fgs1":
            style === ButtonStyle.DEFAULT &&
            type === ButtonVariant.SECONDARY &&
            isHovering
        })}
      />
    {/if}
    {#if label}
      <div class="min-w-fit whitespace-nowrap">
        {label}
      </div>
      <!-- {#if $uiStateDerived?.isShowHotKeyHints && shortcut && $context.embed !== Embed.HANDSET}
        <ShortcutText
          {shortcut}
          parentBgIndex={style === ButtonStyle.PLAIN
            ? parentBgIndex
            : style === ButtonStyle.OUTLINED
              ? parentBgIndex + 1
              : undefined}
        />
      {/if} -->
      {#if badge}
        <Badge text={badge} />
      {/if}
    {:else}
      <slot />
    {/if}
  {/if}
</HoverableElement>
