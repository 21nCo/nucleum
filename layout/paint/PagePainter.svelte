<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import {
    PaintType,
    type Action,
    ThinModeBehavior,
  } from "$lib/tidy/types/action.type";
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import WithPanelOnLeft from "./painters/WithPanelOnLeft.svelte";
  import { appStore, windowObject } from "$lib/tidy/stores/app.store";
  import Button from "$lib/tidy/elements/Button.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import WithYStack from "./painters/YStack/WithYStack.svelte";
  import WithYMenuThinMode from "./painters/YMenuThinMode/WithYMenuThinMode.svelte";
  export let path: string | undefined = undefined;
  export let prefix: string | undefined = undefined;
  let currentComponent: Action | null;
  let parentComponent: Action | null;
  let grandPa: Action | null;
  let pad: number;
  $: if ($windowObject.documentHeight) {
    let rawPad = ($windowObject.documentHeight / 10) * $windowObject.scale;
    pad = rawPad > 200 ? 200 : rawPad;
  }
  onMount(() => {
    resolve(resolveCurrentPath());
    const sub = page.subscribe(() => {
      let currentPath = resolveCurrentPath();
      // console.log({ currentPath, windowObject: $windowObject });
      if ($windowObject.currentPath.includes(currentPath)) {
        resolve(currentPath);
      }
    });
    () => {
      sub;
    };
  });

  function resolveCurrentPath() {
    if (path) return path;
    let currentPath = $page.params.route;
    // console.log({ page: $page });
    if (prefix) {
      currentPath = prefix + "/" + currentPath;
    }
    return currentPath;
  }
  function resolve(currentPath: string) {
    parentComponent = null;
    grandPa = null;
    currentComponent = resolveComponentFromPath(currentPath);
    if (!currentComponent) {
      console.log({ currentPath, page: $page, appData: $appStore.appData });
      if (currentPath == "") {
        windowObject.gotoPath($appStore.appData.homePath ?? "/home");
      } else {
        windowObject.gotoPath($appStore.appData.notFoundPath ?? "/404");
      }
    }
    $windowObject.currentComponent = currentComponent ?? undefined;
    if (currentComponent && currentComponent.isMenuHidden) {
      $windowObject.isMenuHidden = true;
    }
    if (currentComponent && currentComponent.fn) {
      currentComponent.fn();
    }
    let parts = currentPath.split("/");
    if (parts && parts.length > 1) {
      const parent = parts.slice(0, parts.length - 1).join("/");
      parentComponent = resolveComponentFromPath(parent);
      if (parentComponent) {
        parts = parent.split("/");
        if (parts && parts.length > 1) {
          const grandPaPath = parts.slice(0, parts.length - 1).join("/");
          grandPa = resolveComponentFromPath(grandPaPath);
        }
      }
    }
    if ($windowObject.isInPortraitMode) {
      thinModePaint();
    } else {
      paint();
    }
  }

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

  function setPageMenuIfRequired(component: Action) {
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
  <div class="flex flex-col gap-4 w-full h-full">
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
    <!-- {#if currentComponent?.label}
      <Text type={TextType.PAGE_HEADING}>{currentComponent.label}</Text>
    {/if} -->
    <ComponentResolver {currentComponent} />
  </div>
{/if}
