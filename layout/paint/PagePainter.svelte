<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import {
    PaintType,
    type Action,
    ThinModeBehavior
  } from "$lib/tidy/types/action.type";
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import {
    appStore,
    excludedPathsForRedirectionCheck
  } from "$lib/tidy/stores/app.store";
  import view from "$lib/tidy/stores/view.store";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import { performRedirectionChecks } from "$lib/tidy/utils/account.utils";
  import { EmbedContext } from "$lib/tidy/types/appStore.type";
  import context from "$lib/tidy/stores/context.store";
  export let path: string | undefined = undefined;
  export let prefix: string | undefined = undefined;
  let currentComponent: Action | null;
  let parentComponent: Action | null;
  let grandPa: Action | null;
  let pad: number;
  $: if ($view.height) {
    let rawPad = ($view.height / 10) * $view.scale;
    pad = rawPad > 200 ? 200 : rawPad;
  }
  onMount(async () => {
    await resolve(resolveCurrentPath());
    const sub = page.subscribe(async () => {
      let currentPath = resolveCurrentPath();
      if ($view.currentPath.includes(currentPath)) {
        await resolve(currentPath);
      }
    });
    return () => {
      sub();
    };
  });

  function resolveCurrentPath() {
    if (path) return path;
    if ($context.isSheet) {
      console.log("embedcontext, sheetPath", $view.sheetPath);
      return $view.sheetPath ?? "";
    }
    let currentPath = $page?.params?.route;
    //console.log({ currentPath, page: $page, appData: $appStore.appData, path });
    if (prefix) {
      currentPath = prefix + "/" + currentPath;
    }
    return currentPath;
  }
  async function resolve(currentPath: string) {
    if (!excludedPathsForRedirectionCheck.includes(currentPath)) {
      const isProceed = await performRedirectionChecks();
      if (!isProceed) {
        return;
      }
    }
    parentComponent = null;
    grandPa = null;
    currentComponent = resolveComponentFromPath(currentPath);

    if (!currentComponent) {
      console.log({
        currentPath,
        currentComponent,
        homePath: $appStore.appData.homePath,
        notFoundPath: $appStore.appData.notFoundPath
      });
      if (currentPath == "") {
        view.gotoPath($appStore.appData.homePath ?? "/home");
      } else {
        view.gotoPath($appStore.appData.notFoundPath ?? "/404");
      }
    }
    $view.currentComponent = currentComponent ?? undefined;
    if (currentComponent && currentComponent.isMenuHidden) {
      $view.isMenuHidden = true;
    } else if ($appStore.embedContext === EmbedContext.SHEET) {
      $view.isMenuHidden = true;
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
    if ($view.isPortrait) {
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
      view.gotoPath(
        currentComponent.path + "/" + currentComponent.sections[0],
        {
          replaceState: true
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

<!-- {#if currentComponent && currentComponent.sections && currentComponent.sections.length > 0}
  {#if currentComponent.pagePaint === PaintType.PANEL_ON_LEFT && !$view.isPortrait}
    <WithPanelOnLeft {currentComponent} />
  {:else}
    <div
      class="w-full {$view.isPortrait ? 'mb-40' : ''}"
      style="padding: {pad / 4}px;"
    >
      {#if currentComponent.pagePaint === PaintType.PANEL_ON_LEFT && $view.isPortrait && currentComponent.thinModeBehavior === ThinModeBehavior.RIGHT_PANEL_AS_PLAYER}
        <ComponentResolver path={currentComponent.sections[0]} />
      {:else if currentComponent.pagePaint === PaintType.YSTACK || ($view.isPortrait && currentComponent.thinModeBehavior === ThinModeBehavior.YSTACK)}
        <WithYStack {currentComponent} />
      {:else if currentComponent.pagePaint === PaintType.YMENU && $view.isPortrait}
        <WithYMenuThinMode {currentComponent} />
      {/if}
    </div>
  {/if}
{:else} -->
<div class="flex flex-col gap-4 w-full h-full">
  {#if $view.isPortrait && (parentComponent?.pagePaint === PaintType.YMENU || grandPa?.thinModeBehavior === ThinModeBehavior.GRAND_CHILDREN_ON_MENU)}
    <Button
      label="go back"
      size={Size.sm}
      on:click={() => {
        view.gotoPath(
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
  <ComponentResolver action={currentComponent} />
</div>
<!-- {/if} -->
