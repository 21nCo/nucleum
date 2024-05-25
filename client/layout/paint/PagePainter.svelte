<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import {
    PaintType,
    type Action,
    ThinModeBehavior
  } from "$lib/client/types/action.type";
  import {
    appStore,
    excludedPathsForRedirectionCheck
  } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { performRedirectionChecks } from "$lib/client/utils/account.utils";
  import context from "$lib/client/stores/context.store";
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
      if ($appStore.currentPath?.includes(currentPath)) {
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
    currentComponent = appStore.resolveComponentFromPath(currentPath);

    if (!currentComponent) {
      console.log({
        currentPath,
        currentComponent,
        homePath: $appStore.appData.homePath,
        notFoundPath: $appStore.appData.notFoundPath
      });
      if (currentPath == "") {
        appStore.gotoPath($appStore.appData.homePath ?? "/home");
      } else {
        appStore.gotoPath($appStore.appData.notFoundPath ?? "/404");
      }
    }
    $appStore.currentComponent = currentComponent ?? undefined;
    if (currentComponent && currentComponent.isMenuHidden) {
      $appStore.isMenuHidden = true;
    } else if ($context.isSheet) {
      $appStore.isMenuHidden = true;
    }
    if (currentComponent && currentComponent.fn) {
      currentComponent.fn();
    }
    let parts = currentPath.split("/");
    if (parts && parts.length > 1) {
      const parent = parts.slice(0, parts.length - 1).join("/");
      parentComponent = appStore.resolveComponentFromPath(parent);
      if (parentComponent) {
        parts = parent.split("/");
        if (parts && parts.length > 1) {
          const grandPaPath = parts.slice(0, parts.length - 1).join("/");
          grandPa = appStore.resolveComponentFromPath(grandPaPath);
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
      appStore.gotoPath(
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

<div class="flex flex-col gap-4 w-full h-full">
  {#if $view.isPortrait && (parentComponent?.pagePaint === PaintType.YMENU || grandPa?.thinModeBehavior === ThinModeBehavior.GRAND_CHILDREN_ON_MENU)}
    <Button
      label="go back"
      size={Size.sm}
      on:click={() => {
        appStore.gotoPath(
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
