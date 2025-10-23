<script lang="ts">
  import Divider from "@21n/elements/Divider.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { appStore } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import { ActionType } from "@21n/types/action.type";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { abg, bg, cn } from "@21n/utils/ui.utils";
  export let action: string;
  export let orientation: Orientation = Orientation.Horizontal;
  export let width: string = "w-24";
  export let parentBackgroundIndex: number = 1;
  export let isActive: boolean = false;
  export let setActiveByPath: boolean = false;
  export let isShowDivider: boolean = false;
  export let isRoundedTop: boolean = false;
  export let isRoundedBottom: boolean = false;
  const dev_isOutlineStyle: boolean = true;
  let component = appStore.resolveAction(action);
  $: if (setActiveByPath)
    isActive = $view.currentPath === "/" + component?.path;
</script>

{#if component && !component.isInactive}
  <button
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
    on:click
  >
    {#if orientation === Orientation.Horizontal}
      <div class="flex gap-2 w-full">
        <Icon
          icon={component.icon ?? "info"}
          class={cn({
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
          "text-abg": isActive && !dev_isOutlineStyle,
          "text-aps1": isActive && dev_isOutlineStyle
        })}
      />
    {:else}
      <div class="flex flex-col items-center gap-2">
        <Icon
          icon={component.icon}
          class={cn({
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
