<script lang="ts">
  import Element from "$lib/tidy/elements/Element.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";
  import type { ComponentType } from "$lib/tidy/types/component.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  import { onMount } from "svelte";
  export let path: string;
  export let orientation: Orientation = Orientation.Vertical;
  export let parentBackgroundIndex: number = 0;
  let component: ComponentType | undefined;
  onMount(() => {
    component = getComponentFromPath("cp/" + path);
    if (!component) {
      component = getComponentFromPath(path);
    }
  });
</script>

{#if component}
  <Element
    {parentBackgroundIndex}
    isActive={$windowObject.currentPath === "/cp/" + path}
    selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
    hoverStyle={SelectionItemActiveStyle.BG_COLOR}
    classList={orientation === Orientation.Vertical
      ? "bg-bgs2 px-2 py-3 rounded-lg w-24"
      : "flex px-4 py-2 w-full items-center justify-between"}
    on:click={() => {
      windowObject.gotoPath("/cp/" + path);
    }}
  >
    {#if orientation === Orientation.Horizontal}
      <div class="flex gap-2 w-full pl-4">
        <Icon
          icon={component.icon}
          isActive={$windowObject.currentPath === "/cp/" + path}
        />
        <div>{component.label}</div>
      </div>
      <Icon
        icon="chevright"
        isActive={$windowObject.currentPath === "/cp/" + path}
      />
    {:else}
      <div class="flex flex-col items-center gap-2">
        <Icon
          icon={component.icon}
          isActive={$windowObject.currentPath === "/cp/" + path}
        />
        <div>{component.label}</div>
      </div>
    {/if}
  </Element>
{/if}
