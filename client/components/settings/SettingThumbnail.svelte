<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { ActionType } from "$lib/client/types/action.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { abg, bg, cn } from "$lib/client/utils/ui.utils";
  export let action: string;
  export let orientation: Orientation = Orientation.Horizontal;
  export let width: string = "w-24";
  export let parentBackgroundIndex: number = 1;
  export let isActive: boolean = false;
  export let setActiveByPath: boolean = false;
  let isOutlineStyle: boolean = false;
  let component = appStore.resolveAction(action);
  $: if (setActiveByPath)
    isActive = $view.currentPath === "/" + component?.path;
</script>

{#if component}
  <button
    class={cn(orientation === Orientation.Vertical ? width : "", {
      "flex px-4 py-3 w-full items-center justify-between":
        orientation === Orientation.Horizontal,
      "border-y border-transparent": !isActive && isOutlineStyle,
      "bg-aps3 border-y border-aps2 hover:bg-aps2 hover:bg-opacity-50 text-aps1":
        isActive && isOutlineStyle,
      [abg()]: !isOutlineStyle && isActive,
      "px-2 py-3 rounded-md": orientation === Orientation.Vertical,
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
            "fill-aps1": isActive && isOutlineStyle,
            "fill-abg": isActive && !isOutlineStyle
          })}
        />
        <div>{component.label}</div>
      </div>
      <Icon
        icon={component.type === ActionType.LINK ? "link" : "chevright"}
        class={cn({
          "stroke-abg": isActive && !isOutlineStyle,
          "stroke-aps1": isActive && isOutlineStyle
        })}
      />
    {:else}
      <div class="flex flex-col items-center gap-2">
        <Icon
          icon={component.icon}
          class={cn({
            "fill-aps1": isActive && isOutlineStyle,
            "fill-abg": isActive && !isOutlineStyle
          })}
        />
        <div>{component.label}</div>
      </div>
    {/if}
  </button>
{/if}
