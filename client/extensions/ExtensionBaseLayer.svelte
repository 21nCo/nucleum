<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { isTokenExpired, resolveToken } from "@21n/utils/account.utils";
  import account from "@21n/stores/account.store";
  import ExtensionThemeBase from "@21n/extensions/ExtensionThemeBase.svelte";
  import { ClientStorageKey } from "@21n/persistence/persistence.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { clientStorage } from "@21n/persistence/persistence.utils";
  import { createEventDispatcher } from "svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { extractProduct } from "@21n/shared-utils/utils";
  import {
    cleanExtensionSprites,
    extensionSprites
  } from "@21n/icons-v2/icon.store";
  //!Below working with dev but not build or package
  // import sprite from "data-text:/assets/icons/sprite.svg";
  // import spritePhBase from "data-text:/assets/icons/sprite-ph-base.svg";
  // import spritePhFill from "data-text:/assets/icons/sprite-ph-fill.svg";
  // import spritePhLight from "data-text:/assets/icons/sprite-ph-light.svg";
  import { resolveIconSvgSheetText } from "@21n/extensions/iconSvgSheetTextResolver";
  import { appStore } from "@21n/stores/app.store";
  import {
    isRecordId,
    removeDuplicatesFilter
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { parse } from "@21n/shared-utils/json.utils";
  import { ExtensionStore } from "@21n/extensions/extension.store";
  import { Extension } from "@21n/products/product.type";
  const dispatch = createEventDispatcher();
  export let id: string;
  export let extention: Extension;
  export let isLoggedIn: boolean = false;
  export let product: { product: string; env: string };
  $: currentPage = extractProduct(window.location.hostname);
  $: isSelfPage =
    currentPage.product === "memotron" ||
    (typeof process !== "undefined" ? process.env?.NODE_ENV === "development" : false);

  const sprites = [
    "sprite",
    "sprite-ph-base",
    "sprite-ph-light",
    "sprite-ph-fill"
  ];

  sprites.forEach((key) => {
    const content = resolveIconSvgSheetText(key);
    if (!content) return;
    const blob = new Blob([content], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    extensionSprites.set(key, url);
  });

  let windowMessageHandler: (event: MessageEvent) => void;
  onMount(async () => {
    dispatch("mount");
    appStore.initializeProductInformation(product);
    addEventListeners();
    windowMessageHandler = async function (event: MessageEvent) {
      if (event.source != window || !isSelfPage) return;
      if (event.data.type && event.data.type == "signin") {
        await clientStorage.set(
          ClientStorageKey.STOKEN,
          event.data.token.token
        );
        await clientStorage.set(
          ClientStorageKey.USER_INFO,
          event.data.token.userInfo
        );
        dispatch("login", {
          code: 1
        });
        await bootup();
      }
    };
    window.addEventListener("message", windowMessageHandler, false);
    await refreshUserSession();
  });

  onDestroy(() => {
    cleanExtensionSprites();
    removeEventListeners();
    if (windowMessageHandler) {
      window.removeEventListener("message", windowMessageHandler, false);
    }
  });

  function addEventListeners() {
    window.addEventListener("addToRecents", handleAddToRecents);
  }

  function removeEventListeners() {
    window.removeEventListener("addToRecents", handleAddToRecents);
  }

  async function refreshUserSession() {
    const token = await resolveToken();
    let isSessionExpired = false;
    if (token) isSessionExpired = await checkIfSessionExpired(token);
    if (!token || isSessionExpired) {
      dispatch("login", {
        code: -1
      });
      return;
    }
    await bootup();
    return true;
  }

  async function checkIfSessionExpired(token: string) {
    logger.log({ at: "checkIfSessionExpired" });
    const isExpired = isTokenExpired(token);
    if (isExpired) {
      await clientStorage.remove(ClientStorageKey.STOKEN);
      return true;
    }
    return false;
  }

  export async function onTabUpdate() {
    const token = await resolveToken();
    if (token) {
      await ExtensionStore.getInstance()?.syncDown();
    }
    return token;
  }

  async function bootup() {
    try {
      await account.init();
      isLoggedIn = true;
      logger.log({
        at: "ExtensionBaseLayer.svelte bootup",
        account: $account
      });
      const ext = ExtensionStore.getInstance(extention);
      await ext?.bootup(extention);
    } catch (e) {
      logger.error({
        at: "ExtensionBaseLayer.bootup",
        error: e
      });
    }
  }

  export async function loadInMemoryStore(resource: Resource) {
    logger.log({
      at: "ExtensionBaseLayer.loadInMemoryResourceStore",
      resource
    });
    if (!resource) return;
    await ExtensionStore.getInstance()?.loadInMemoryResourceStore(resource);
  }

  async function handleAddToRecents(event: any) {
    try {
      const { record } = event.detail;
      if (!record || !record.id) return;
      const currentRecents = await clientStorage.get(ClientStorageKey.RECENTS);
      const newRecents = [
        { ...record, id: record.id.toString() },
        ...(currentRecents ? parse(currentRecents) : [])
      ]
        .filter(removeDuplicatesFilter)
        .filter((x: any) => isRecordId(x.id));
      await clientStorage.set(
        ClientStorageKey.RECENTS,
        newRecents.slice(0, 10)
      );
    } catch (e) {
      logger.error({
        at: "ExtensionBaseLayer.handleAddToRecents",
        error: e
      });
    }
  }

  function onFocus() {
    onTabUpdate();
  }
</script>

<!-- <div
  {id}
  class={cn(
    "text-base text-fgs1 relative",
    $appearance.theme,
    $appearance.colorScheme.tailwindSelector
  )}
>
  <ThemeLayer extensionContext={id}>
    <slot />
  </ThemeLayer>
  {#if isMounted}
    <CacheLayer />
  {/if}
</div> -->
<ExtensionThemeBase {id}>
  <slot />
</ExtensionThemeBase>
<svelte:window on:focus={onFocus} />
