<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import Divider from "@21n/ui/elements/Divider.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";

  import { ActionType } from "@nucleum/client/config/action.type";
  import { ColorStrength } from "@21n/theme/appearance.type";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import { abg, bg, cn } from "@21n/ui/environment/presentation";
  let {
    action,
    orientation = Orientation.Horizontal,
    width = "w-24",
    parentBackgroundIndex = 1,
    isActive = false,
    isShowDivider = false,
    isRoundedTop = false,
    isRoundedBottom = false,
    onclick = undefined
  }: {
    action: string;
    orientation?: Orientation;
    width?: string;
    parentBackgroundIndex?: number;
    isActive?: boolean;
    isShowDivider?: boolean;
    isRoundedTop?: boolean;
    isRoundedBottom?: boolean;
    onclick?: ((event: MouseEvent) => void) | undefined;
  } = $props();
  const dev_isOutlineStyle: boolean = true;
  const component = $derived(requireCommandHost().resolveAction(action));

  function handleInteraction(event: MouseEvent) {
    onclick?.(event);
  }
</script>

{#if component && !component.isInactive}
  <button
    type="button"
    class={cn(orientation === Orientation.Vertical ? width : "", {
      "rounded-t-lg": isRoundedTop,
      "rounded-b-lg": isRoundedBottom,
      "flex px-4 py-3 w-full items-center justify-between":
        orientation === Orientation.Horizontal,
      "border-y border-transparent": !isActive && dev_isOutlineStyle,
      "notouch:hover:bg-bgs3-striped": !isActive,
      "bg-aps3 border-y border-aps3 hover:bg-aps2 hover:bg-opacity-50 text-aps1":
        isActive && dev_isOutlineStyle,
      [abg()]: !dev_isOutlineStyle && isActive,
      "px-2 py-3 rounded-md hover:bg-bgs3-striped":
        orientation === Orientation.Vertical,
      [bg(
        orientation === Orientation.Vertical
          ? parentBackgroundIndex
          : parentBackgroundIndex - 1
      )]: !isActive
    })}
    onclick={handleInteraction}
  >
    {#if orientation === Orientation.Horizontal}
      <div class="flex gap-2 w-full">
        <Icon
          icon={component.icon ?? "info"}
          class={cn({
            "pointer-events-none": true,
            "fill-aps1": isActive && dev_isOutlineStyle,
            "fill-abg": isActive && !dev_isOutlineStyle
          })}
        />
        <div>{component.label}</div>
      </div>
      <Icon
        icon={component.type === ActionType.LINK
          ? "weblink-two"
          : "chevron-right"}
        class={cn({
          "pointer-events-none": true,
          "text-abg": isActive && !dev_isOutlineStyle,
          "text-aps1": isActive && dev_isOutlineStyle
        })}
      />
    {:else}
      <div class="flex flex-col items-center gap-2">
        <Icon
          icon={component.icon}
          class={cn({
            "pointer-events-none": true,
            "fill-aps1": isActive && dev_isOutlineStyle,
            "fill-abg": isActive && !dev_isOutlineStyle
          })}
        />
        <div class="text-b2">{component.label}</div>
      </div>
    {/if}
  </button>
  {#if orientation === Orientation.Horizontal && isShowDivider && !isRoundedBottom}
    <Divider colorStrength={ColorStrength.Subtle} />
  {/if}
{/if}
