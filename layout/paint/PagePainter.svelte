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
  import WithPanelOnLeft from "./painters/WithPanelOnLeft.svelte";
  import { appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { goto } from "$app/navigation";
  import Button from "$lib/tidy/elements/Button.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import WithYStack from "./painters/YStack/WithYStack.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import WithYMenuThinMode from "./painters/YMenuThinMode/WithYMenuThinMode.svelte";
  import { notFoundAction } from "$lib/tidy/utils/actions";
  export let path: string | undefined = undefined;
  let currentComponent: ComponentType | undefined;
  let parentComponent: ComponentType | undefined;
  let grandPa: ComponentType | undefined;
  let pad: number;
  $: if ($windowObject.documentHeight) {
    let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
    pad = rawPad > 200 ? 200 : rawPad;
  }
  onMount(() => {
    page.subscribe(() => {
      parentComponent = undefined;
      grandPa = undefined;
      const currentPath = $page.params.route;
      currentComponent = getComponentFromPath(path ?? currentPath);
      if (!currentComponent) {
        notFoundAction();
      }
      if (currentComponent && currentComponent.action) {
        currentComponent.action();
      }
      let parts = currentPath.split("/");
      if (parts && parts.length > 1) {
        const parent = parts.slice(0, parts.length - 1).join("/");
        parentComponent = getComponentFromPath(parent);
        if (parentComponent) {
          parts = parent.split("/");
          if (parts && parts.length > 1) {
            const grandPaPath = parts.slice(0, parts.length - 1).join("/");
            grandPa = getComponentFromPath(grandPaPath);
          }
        }
      }
      if ($windowObject.isInPortraitMode) {
        thinModePaint();
      } else {
        paint();
      }
    });
  });

  function thinModePaint() {
    if (
      currentComponent?.thinModeBehavior ===
      ThinModeBehavior.RIGHT_PANEL_AS_PLAYER
    ) {
      //toggle player
    }
  }
  function paint() {
    const isSet = setPageMenuIfRequired(currentComponent!);
    if (isSet && currentComponent?.sections) {
      windowObject.gotoPath(
        currentComponent.path + "/" + currentComponent.sections[0],
        {
          replaceState: true,
        }
      );
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
      let children: string[] = [];
      component.sections!.forEach((element) => {
        children.push(component.path + "/" + element);
      });
      $appStore.pageMenu = children;
      return true;
    }
  }
</script>

{#if currentComponent && currentComponent.sections && currentComponent.sections.length > 0}
  {#if currentComponent.pagePaint === PaintType.PANEL_ON_LEFT && !$windowObject.isInPortraitMode}
    <WithPanelOnLeft {currentComponent} />
  {:else}
    <div
      class="w-full {$windowObject.isInPortraitMode ? 'mb-40' : ''}"
      style="padding: {pad / 4}px;"
    >
      {#if currentComponent.pagePaint === PaintType.PANEL_ON_LEFT && $windowObject.isInPortraitMode && currentComponent.thinModeBehavior === ThinModeBehavior.RIGHT_PANEL_AS_PLAYER}
        <ComponentResolver path={currentComponent.sections[0]} />
      {:else if currentComponent.pagePaint === PaintType.YSTACK || ($windowObject.isInPortraitMode && currentComponent.thinModeBehavior === ThinModeBehavior.YSTACK)}
        <WithYStack {currentComponent} />
      {:else if currentComponent.pagePaint === PaintType.YMENU && $windowObject.isInPortraitMode}
        <WithYMenuThinMode {currentComponent} />
      {/if}
    </div>
  {/if}
{:else}
  <div
    class="flex flex-col gap-4 w-full h-full p-4 {$windowObject.isInPortraitMode
      ? 'mb-40'
      : ''}"
  >
    {#if $windowObject.isInPortraitMode && (parentComponent?.pagePaint === PaintType.YMENU || grandPa?.thinModeBehavior === ThinModeBehavior.GRAND_CHILDREN_ON_MENU)}
      <Button
        label="go back"
        size={Size.sm}
        on:click={() => {
          windowObject.gotoPath(
            "/" +
              (parentComponent?.pagePaint === PaintType.YMENU
                ? parentComponent?.path
                : grandPa?.path),
            { replaceState: true }
          );
        }}
      />
    {/if}
    {#if currentComponent?.label}
      <Text type={TextType.PAGE_HEADING}>{currentComponent.label}</Text>
    {/if}
    <ComponentResolver {currentComponent} />
  </div>
{/if}
