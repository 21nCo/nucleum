<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { abg, bg, cn } from "$lib/client/utils/ui.utils";
  export let action: string;
  export let orientation: Orientation = Orientation.Horizontal;
  export let width: string = "w-24";
  export let parentBackgroundIndex: number = 1;
  export let isActive: boolean = false;
  export let setActiveByPath: boolean = false;
  let component = appStore.resolveComponent(action);
  console.log({ component, action });
  $: if (setActiveByPath)
    isActive = $view.currentPath === "/" + component?.path;
</script>

{#if component}
  <button
    class={cn(
      orientation === Orientation.Vertical ? width : "",
      abg(isActive),
      {
        "px-2 py-3 rounded-md": orientation === Orientation.Vertical,
        "flex px-4 py-3 w-full items-center justify-between":
          orientation === Orientation.Horizontal,
        [bg(
          orientation === Orientation.Vertical
            ? parentBackgroundIndex
            : parentBackgroundIndex - 1
        )]: !isActive
      }
    )}
    on:click
  >
    {#if orientation === Orientation.Horizontal}
      <div class="flex gap-2 w-full">
        <Icon icon={component.icon ?? "info"} isAccentBgContext={isActive} />
        <div>{component.label}</div>
      </div>
      <Icon
        icon={component.link ? "link" : "chevright"}
        class={cn({
          "stroke-abg": isActive
        })}
      />
    {:else}
      <div class="flex flex-col items-center gap-2">
        <Icon icon={component.icon} isAccentBgContext={isActive} />
        <div>{component.label}</div>
      </div>
    {/if}
  </button>
{/if}
