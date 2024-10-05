<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import { Theme } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";

  let className: string = "";
  export { className as class };
  let isNight: boolean = false;
  onMount(() => {
    $appearance.isSyncWithSystem = false;
    $appearance.lightColorSchemeId = "colorscheme:clean_tidymono_light";
    $appearance.darkColorSchemeId = "colorscheme:clean_tidymono_dark";
    if ($appearance.theme === Theme.DARK) isNight = true;
    else isNight = false;
  });
  function toggle() {
    isNight = !isNight;
    appearance.modifyUserThemeSetting(
      $appearance.theme === Theme.DARK ? Theme.LIGHT : Theme.DARK
    );
  }
</script>

<div class={className}>
  <button
    class="relative flex items-center justify-around w-[60px] h-[28px] rounded-[48px] border border-fgs1"
    on:click={toggle}
  >
    <div
      class={cn(
        "h-[28px] w-[28px] border border-fgs1 bg-bgs2 rounded-[48px] absolute transition-transform",
        isNight && "right-0 animate-bounce-r",
        !isNight && "left-0 animate-bounce-l"
      )}
    ></div>
    <SvgIcon icon="sun" size={Size.sm} class="z-10" />
    <SvgIcon icon="moon" size={Size.sm} class="z-10" />
  </button>
</div>
