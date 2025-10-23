<script lang="ts">
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { Size } from "@21n/types/size.enum";
  import { bg, cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import view from "@21n/stores/view.store";
  import { appStore } from "@21n/stores/app.store";
  import modalEvent from "@21n/components/modal/modal.store";
  import { haptic } from "@21n/utils/embed.utils";
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
      dispatch("back");
      return;
    }
    if ($view.isConstrainedWidth && !path) {
      appStore.goBack();
    } else {
      appStore.closeResource({ accessMode });
    }
    if (path) modalEvent.hide(path, "BackButton.svelte");
  }
</script>

<button
  class={cn(
    "flex items-center rounded-md",
    $$slots.default
      ? "gap-2 px-1"
      : "gap-0 p-1 rounded-r-md rounded-l-full active:bg-bgs2 notouch:hover:bg-bgs2",
    classList,
    {
      "cursor-pointer": isEnabled,
      "cursor-default": !isEnabled,
      [`active:${bg(parentBgIndex)}`]: isEnabled && $$slots.default
    }
  )}
  type="button"
  tabindex={isEnabled ? 0 : -1}
  aria-disabled={!isEnabled}
  disabled={!isEnabled}
  aria-label={$$slots.default ? undefined : (text ?? "Back")}
  on:click={onBack}
>
  {#if $$slots.default}
    {#if isEnabled}
      <Icon icon="chevron-left" size={Size.lg} />
    {/if}
    <slot />
  {:else}
    <Icon icon="chevron-left" size={Size.sm} />
    <div class="pr-1 text-fgs1">{text ?? "Back"}</div>
  {/if}
</button>
