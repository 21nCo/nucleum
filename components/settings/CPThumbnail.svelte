<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import ActiveBackgroundElement from "$lib/tidy/elements/Style/ActiveBackgroundElement.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { resolveComponent } from "$lib/tidy/utils/utils";
  export let action: string;
  export let orientation: Orientation = Orientation.Horizontal;
  export let width: string = "w-24";
  export let parentBackgroundIndex: number = 0;
  let selectionStyle = SelectionItemActiveStyle.ACCENT_BACKGROUND;
  let component = resolveComponent(action);
  $: isActive = $windowObject.currentPath === "/" + component?.path;
</script>

{#if component}
  <ActiveBackgroundElement
    classList="{orientation === Orientation.Vertical
      ? 'px-2 py-3 rounded-md'
      : 'flex px-4 py-2 w-full items-center justify-between'} {orientation ===
      Orientation.Vertical && width}"
    isBackgroundActive={isActive}
    bgWhenInactive={orientation === Orientation.Vertical ? 2 : 1}
    on:click
  >
    {#if orientation === Orientation.Horizontal}
      <div class="flex gap-2 w-full">
        <Icon
          size={Size.sm}
          icon={component.icon ?? "info"}
          {isActive}
          {selectionStyle}
        />
        <div>{component.alternateLabel ?? component.label}</div>
      </div>
      <Icon
        icon={component.link ? "link" : "chevright"}
        {isActive}
        {selectionStyle}
      />
    {:else}
      <div class="flex flex-col items-center gap-2">
        <Icon icon={component.icon} {isActive} {selectionStyle} />
        <div>{component.alternateLabel ?? component.label}</div>
      </div>
    {/if}
  </ActiveBackgroundElement>
{/if}
