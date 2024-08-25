<script lang="ts">
  import { player } from "../components/modal/modal.store";
  import view from "../stores/view.store";
  import { cn } from "../utils/ui.utils";
  export let isAppMenuHidden: boolean = false;
  let classList: string = "";
  export { classList as class };
</script>

<div
  class={cn(
    "absolute bottom-0 flex w-full justify-center z-20",
    {
      "mb-8": $view.isPortrait && isAppMenuHidden,
      "mb-[10.5rem]": $view.isPortrait && $player.isMiniOn,
      "mb-24": $view.isPortrait,
      "mb-4": !$view.isPortrait
    },
    classList
  )}
>
  <slot />
</div>
