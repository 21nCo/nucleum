<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import ActiveBackgroundElement from "$lib/tidy/elements/style/ActiveBackgroundElement.svelte";
  import view from "$lib/tidy/stores/view.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { resolveComponent } from "$lib/tidy/utils/utils";
  export let action: string;
  export let orientation: Orientation = Orientation.Horizontal;
  export let width: string = "w-24";
  export let parentBackgroundIndex: number = 1;
  export let isActive: boolean = false;
  export let setActiveByPath: boolean = false;
  let selectionStyle = SelectionItemActiveStyle.ACCENT_BACKGROUND;
  let component = resolveComponent(action);
  $: if (setActiveByPath)
    isActive = $view.currentPath === "/" + component?.path;
</script>

{#if component}
  <ActiveBackgroundElement
    class="{orientation === Orientation.Vertical
      ? 'px-2 py-3 rounded-md'
      : 'flex px-4 py-3 w-full items-center justify-between'} {orientation ===
      Orientation.Vertical && width}"
    isBackgroundActive={isActive}
    bgWhenInactive={orientation === Orientation.Vertical
      ? parentBackgroundIndex + 1
      : parentBackgroundIndex}
    on:click
  >
    {#if orientation === Orientation.Horizontal}
      <div class="flex gap-2 w-full">
        <Icon icon={component.icon ?? "info"} {isActive} {selectionStyle} />
        <div>{component.label}</div>
      </div>
      <Icon
        icon={component.link ? "link" : "chevright"}
        {isActive}
        {selectionStyle}
      />
    {:else}
      <div class="flex flex-col items-center gap-2">
        <Icon icon={component.icon} {isActive} {selectionStyle} />
        <div>{component.label}</div>
      </div>
    {/if}
  </ActiveBackgroundElement>
{/if}
