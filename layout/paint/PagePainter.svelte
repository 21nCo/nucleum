<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import { components } from "$lib/tidy/layout/componentMap";
  import {
    PaintType,
    type ComponentType,
  } from "$lib/tidy/types/component.type";
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  import PanelOnLeft from "./painters/PanelOnLeft.svelte";
  import { appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { goto } from "$app/navigation";
  let currentComponent = components[0];
  let pad: number;
  $: if ($windowObject.documentHeight) {
    let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
    pad = rawPad > 200 ? 200 : rawPad;
  }
  onMount(() => {
    page.subscribe(() => {
      let component = getComponentFromPath($page.params.route);
      if (
        component &&
        component.sections &&
        component.sections.length > 0 &&
        (component.pagePaint === PaintType.YMENU ||
          component.pagePaint === PaintType.XMENU)
      ) {
        setPageMenu(component);
        goto(component.path + "/" + component.sections[0], {
          replaceState: true,
        });
      } else {
        currentComponent = component;
        let parts = currentComponent.path.split("/");
        if (
          parts &&
          parts.length > 1 &&
          $appStore.pageMenu &&
          $appStore.pageMenu.length < 1
        ) {
          const parent = parts.slice(0, parts.length - 1).join("/");
          const component = getComponentFromPath(parent);
          setPageMenu(component);
        } else if (parts.length === 1) {
          $appStore.pageMenu = [];
        }
      }
    });
  });
  function setPageMenu(component: ComponentType) {
    if (
      component &&
      component.sections &&
      component.sections.length > 0 &&
      (component.pagePaint === PaintType.YMENU ||
        component.pagePaint === PaintType.XMENU)
    ) {
      let children: ComponentType[] = [];
      component.sections!.forEach((element) => {
        children.push(getComponentFromPath(component.path + "/" + element));
      });
      $appStore.pageMenu = children;
      return true;
    }
  }
</script>

{#if currentComponent.pagePaint === PaintType.PANEL_ON_LEFT && currentComponent.sections && currentComponent.sections.length > 0}
  <PanelOnLeft {currentComponent} />
{:else}
  <div class="flex flex-col gap-4 w-full h-full" style="padding: {pad / 4}px;">
    <ComponentResolver {currentComponent} />
  </div>
{/if}
