<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import Icon from "@21n/elements/Icon.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Placement } from "@21n/types/direction.enum";
  import { bg, cn } from "@21n/utils/ui.utils";
  import type { IPopoverRenderBaseParams } from "@21n/types/popover.type";
  import Badge from "@21n/elements/text/Badge.svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import { popover } from "@21n/actions/popover.action";
  import ShortcutText from "@21n/elements/text/ShortcutText.svelte";
  import type { IKeyboardShortcut } from "@21n/components/shortcuts/shortcut.type";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import ButtonTooltip from "@21n/elements/button/ButtonTooltip.svelte";
  export let parentBgIndex: number = 1;
  export let label: string | undefined = undefined;
  export let className: string = "";
  export { className as class };
  export let variant: ButtonVariant = ButtonVariant.SECONDARY;
  /** button type description to be rendered in stories and code editor tooltips*/
  export let type: "primary" | "secondary" | "danger" | ButtonVariant = variant;
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
  /** Optional test id for e2e (e.g. data-testid) */
  export let testId: string | undefined = undefined;
  /** Accessible name when button is icon-only (e.g. for screen readers and e2e) */
  export let ariaLabel: string | undefined = undefined;
  let buttonRef: any;
  export let isHovering: boolean = false;
  export let shortcut: string | IKeyboardShortcut | undefined = undefined;
  export let badge: string | undefined = undefined;
  export let isBoxed: boolean = false;
  $: isIconOnlyButton = !label && !$$slots.default;
  $: shortcutSize = size === Size.xs ? Size.sm : Size.md;
  $: iconSize = size === Size.xs ? Size.sm : size;
  $: iconClass = {
    "text-aps1":
      (style === ButtonStyle.OUTLINED && type === ButtonVariant.PRIMARY) ||
      (isHovering &&
        style === ButtonStyle.PLAIN &&
        type === ButtonVariant.SECONDARY),
    "text-ars1":
      (style === ButtonStyle.OUTLINED ||
        style === ButtonStyle.PLAIN ||
        (isIconOnlyButton && style === ButtonStyle.DEFAULT)) &&
      type === ButtonVariant.DANGER,
    "text-fgs2": type === ButtonVariant.SECONDARY,
    "text-abg":
      style === ButtonStyle.DEFAULT &&
      (type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER),
    "text-fgs1":
      style === ButtonStyle.DEFAULT &&
      type === ButtonVariant.SECONDARY &&
      isHovering
  };
</script>

<button
  {id}
  aria-label={ariaLabel}
  data-testid={testId}
  use:hoverable={{
    onHover: (val) => {
      isHovering = val;
    }
  }}
  type="button"
  class={cn(
    "relative flex flex-row justify-center items-center",
    {
      "w-full": isExpandToFullWidth,
      "opacity-70 cursor-not-allowed hover:opacity-50": isDisabled || isLoading,
      "gap-4 text-base": size === Size.lg,
      "gap-2 text-b2 dp:text-base": size === Size.md,
      "gap-2 text-b3 dp:text-b2": size === Size.sm,
      "gap-1 text-b4 dp:text-b3": size === Size.xs,
      "p-1.5 rounded-md": isIconOnlyButton && !isBoxed,
      "w-full h-full": isBoxed,
      "rounded-full": !isBoxed,
      [bg(parentBgIndex)]:
        isHovering && isIconOnlyButton && style !== ButtonStyle.PLAIN,
      "underline-dotted hover:underline-dotted-primary":
        style === ButtonStyle.PLAIN && isUnderlined
    },
    style === ButtonStyle.PLAIN && {
      "text-fgs2 hover:text-aps1": type === ButtonVariant.SECONDARY,
      "text-aps1 hover:brightness-110": type === ButtonVariant.PRIMARY,
      "text-ars1 hover:brightness-110": type === ButtonVariant.DANGER
    },
    style !== ButtonStyle.PLAIN &&
      !isPreventMinWidth &&
      !isIconOnlyButton && {
        "min-w-32": size === Size.lg || size === Size.md || size === Size.sm,
        "min-w-fit": size === Size.xs
      },
    style !== ButtonStyle.PLAIN &&
      !isBoxed &&
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
          "hover:brightness-110 text-abg":
            type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER,
          "bg-aps1": type === ButtonVariant.PRIMARY,
          "bg-ars1": type === ButtonVariant.DANGER,
          "border border-transparent hover:border-brs3":
            type === ButtonVariant.SECONDARY && !isBoxed,
          [bg(parentBgIndex + 1)]: type === ButtonVariant.SECONDARY,
          [`hover:${bg(parentBgIndex + 2)}-striped`]:
            type === ButtonVariant.SECONDARY
        }
      ],
    style === ButtonStyle.OUTLINED && [
      {
        border: !isBoxed,
        "border-aps2 bg-aps3 text-aps1 hover:bg-aps2-striped hover:border-aps1":
          type === ButtonVariant.PRIMARY,
        "border-brs3 text-fgs2 hover:text-fgs1":
          type === ButtonVariant.SECONDARY,
        [`${bg(parentBgIndex)}-striped`]:
          type === ButtonVariant.SECONDARY && isHovering,
        "border-ars1 text-ars1": type === ButtonVariant.DANGER
      }
    ],
    className
  )}
  on:click
  on:mousedown
  bind:this={buttonRef}
  use:popover={{
    content: tooltip ? ButtonTooltip : "",
    triggerMethod: tooltip ? [PopoverTriggerMethod.HOVER] : [],
    placement: tooltipOptions.placement,
    offsetInPx: tooltipOptions.offsetInPx,
    isSecondary: true,
    id: `button-tooltip-popover-${id || "default"}`,
    componentProps: tooltip
      ? {
          tooltip,
          shortcut,
          size: shortcutSize,
          parentBgIndex
        }
      : {}
  }}
  disabled={isDisabled || isLoading}
>
  {#if isLoading}
    <Icon
      icon="svg-spinners:bars-scale-fade"
      class={cn(iconClass)}
      size={iconSize}
    />
  {:else}
    {#if icon}
      <Icon {icon} size={iconSize} class={cn(iconClass)} />
    {/if}
    {#if label}
      <div class="min-w-fit whitespace-nowrap">
        {label}
      </div>
      <ShortcutText
        {shortcut}
        size={shortcutSize}
        parentBgIndex={style === ButtonStyle.PLAIN
          ? parentBgIndex
          : style === ButtonStyle.OUTLINED && type !== ButtonVariant.PRIMARY
            ? parentBgIndex + 1
            : undefined}
        isAccentOutlined={style === ButtonStyle.OUTLINED &&
          type === ButtonVariant.PRIMARY}
      />
      {#if badge}
        <Badge text={badge} />
      {/if}
    {:else}
      <slot />
    {/if}
  {/if}
</button>
