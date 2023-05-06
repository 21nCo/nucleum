<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import { components } from "$lib/tidy/layout/componentMap";
  import {
    PaintType,
    type ComponentType,
    ThinModeBehavior,
  } from "$lib/tidy/types/component.type";
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  import PanelOnLeft from "./painters/WithPanelOnLeft.svelte";
  import { appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { goto } from "$app/navigation";
  import Button from "$lib/tidy/elements/Button.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  let currentComponent = components[0];
  let parentComponent: ComponentType | undefined;
  let pad: number;
  $: if ($windowObject.documentHeight) {
    let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
    pad = rawPad > 200 ? 200 : rawPad;
  }
  onMount(() => {
    page.subscribe(() => {
      parentComponent = undefined;
      const currentPath = $page.params.route;
      currentComponent = getComponentFromPath(currentPath);
      let parts = currentPath.split("/");
      if (parts && parts.length > 1) {
        const parent = parts.slice(0, parts.length - 1).join("/");
        parentComponent = getComponentFromPath(parent);
      }
      console.log({ currentPath, parts, parentComponent });
      if ($windowObject.isInThinMode) {
        thinModePaint();
      } else {
        paint();
      }
    });
  });

  function thinModePaint() {
    if (
      currentComponent.thinModeBehavior ===
      ThinModeBehavior.RIGHT_PANEL_AS_PLAYER
    ) {
      //toggle player
    }
  }
  function paint() {
    const isSet = setPageMenuIfRequired(currentComponent);
    if (isSet && currentComponent.sections) {
      goto(currentComponent.path + "/" + currentComponent.sections[0], {
        replaceState: true,
      });
    } else {
      if (
        parentComponent &&
        $appStore.pageMenu &&
        $appStore.pageMenu.length < 1
      ) {
        setPageMenuIfRequired(parentComponent);
      } else if (!parentComponent) {
        $appStore.pageMenu = [];
      }
    }
  }

  function setPageMenuIfRequired(component: ComponentType) {
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
  {#if $windowObject.isInThinMode && currentComponent.thinModeBehavior === ThinModeBehavior.RIGHT_PANEL_AS_PLAYER}
    <div style="padding: {pad / 4}px;">
      <ComponentResolver path={currentComponent.sections[0]} />
    </div>
  {:else}
    <PanelOnLeft {currentComponent} />
  {/if}
{:else}
  <div class="flex flex-col gap-4 w-full h-full">
    {#if $windowObject.isInThinMode && parentComponent?.pagePaint === PaintType.YMENU}
      <Button
        label="go back"
        size={Size.sm}
        on:click={() => {
          goto("/" + parentComponent?.path, { replaceState: true });
        }}
      />
    {/if}
    <ComponentResolver {currentComponent} />
  </div>
{/if}
