<script lang="ts">
  import { tooltip } from "$lib/client/actions/popover.action";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { tabs } from "$lib/client/layout/tabs/tabs.store";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  export let path: string | undefined = undefined;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.FULL;
  /**
   * If true, the button will be fully rounded and floating with a margin from the edges. Otherwise, it will stick to the top right corner.
   */
  export let isFloat: boolean = false;
  export let style: ButtonVariant = ButtonVariant.SECONDARY;
</script>

<!-- TODO - watch - changing z-[1000] to z-40 as this is showing close button on top of resource modal when something is in split screen inline -->
<button
  class={cn(
    "absolute w-10 h-10 bg-ars1 opacity-70 hover:opacity-100 flex justify-center items-center z-40 top-0 right-0",
    {
      "rounded-full m-3": isFloat,
      "m-0 rounded-bl-md": !isFloat,
      "bg-bgs2 border border-brs3": style === ButtonVariant.SECONDARY,
      "bg-ars1": style === ButtonVariant.DANGER
    }
  )}
  use:tooltip={{ text: "Close", direction: Placement.Left }}
  on:click={() => {
    if ($view.isConstrainedWidth && !path) appStore.goBack();
    appStore.closeResource({ accessMode });
    if (path) modalEvent.hide(path, "ModalCloseButton.svelte");
  }}
>
  <Icon
    icon="ph:x-light"
    class={cn({
      "stroke-bgs1": style === ButtonVariant.DANGER,
      "stroke-fgs1": style === ButtonVariant.SECONDARY
    })}
  />
</button>
