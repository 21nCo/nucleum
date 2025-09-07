<script lang="ts">
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import Icon from "../Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import { appStore } from "$lib/client/stores/app.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { haptic } from "$lib/client/utils/embed.utils";
  const dispatch = createEventDispatcher();
  export let text: string | undefined = undefined;
  export let parentBgIndex: number = 1;
  export let isEnabled: boolean = true;
  export let path: string | undefined = undefined;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.FULL;
  export let isPreventDefault: boolean = false;
  let classList: string = "";
  export { classList as class };

  function onBack() {
    if (!isEnabled) return;
    haptic();
    if (isPreventDefault) {
      dispatch("click");
      return;
    }
    if ($view.isConstrainedWidth && !path) appStore.goBack();
    appStore.closeResource({ accessMode });
    if (path) modalEvent.hide(path, "ModalCloseButton.svelte");
  }
</script>

{#if $$slots.default}
  <button
    class={cn(
      "flex items-center gap-2 rounded-md px-1",
      classList,
      `active:${bg(parentBgIndex)}`,
      {
        "cursor-pointer": isEnabled,
        "cursor-default": !isEnabled
      }
    )}
    tabindex={isEnabled ? 0 : -1}
    on:click={onBack}
  >
    {#if isEnabled}
      <Icon icon="chevron-left" class="text-fgs3 opacity-40" size={Size.lg} />
    {/if}
    <slot />
  </button>
{:else}
  <button
    class="flex items-center active:bg-bgs2 notouch:hover:bg-bgs2 rounded-r-md rounded-l-full p-1"
    on:click={onBack}
  >
    <Icon icon="chevleft" size={Size.sm} />
    <div class="pr-1 text-fgs1">{text ?? "Back"}</div>
  </button>
{/if}
