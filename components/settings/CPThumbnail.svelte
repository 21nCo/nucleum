<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { userPreferences, windowObject } from "$lib/tidy/stores/app.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { retrieveCurrentColors, bg } from "$lib/tidy/utils/theme.utils";
  import { resolveAction, resolveComponent } from "$lib/tidy/utils/utils";
  export let action: string;
  export let orientation: Orientation = Orientation.Horizontal;
  export let parentBackgroundIndex: number = 0;
  let selectionStyle = SelectionItemActiveStyle.ACCENT_BACKGROUND;
  let component = resolveComponent(action);
  $: isActive = $windowObject.currentPath === "/" + component?.path;
  $: iconColor = retrieveCurrentColors($userPreferences)?.fgs1 ?? "";
</script>

{#if component}
  <button
    class="{orientation === Orientation.Vertical
      ? 'px-2 py-3 w-24 rounded-md'
      : 'flex px-4 py-2 w-full items-center justify-between'} {isActive
      ? 'bg-a1 text-bgs1'
      : !$windowObject.isInPortraitMode
      ? 'hover:' + bg($userPreferences.theme, 1)
      : ''} {orientation === Orientation.Vertical && !isActive
      ? bg($userPreferences.theme, 1)
      : ''}"
    on:click={() => {
      resolveAction(action);
    }}
  >
    {#if orientation === Orientation.Horizontal}
      <div class="flex gap-2 w-full">
        <Icon
          icon={component.icon ?? "info"}
          {isActive}
          {selectionStyle}
          color={iconColor}
        />
        <div>{component.label}</div>
      </div>
      <Icon
        icon={component.link ? "link" : "chevright"}
        {isActive}
        {selectionStyle}
      />
    {:else}
      <div class="flex flex-col items-center gap-2">
        <Icon
          icon={component.icon}
          {isActive}
          {selectionStyle}
          color={iconColor}
        />
        <div>{component.label}</div>
      </div>
    {/if}
  </button>
{/if}
