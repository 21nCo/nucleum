<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import appearance from "@21n/stores/appearance.store";
  import { Theme } from "@21n/types/appearance.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { onMount } from "svelte";

  let className: string = "";
  export { className as class };
  let isNight: boolean = false;

  onMount(() => {
    $appearance.isSyncWithSystem = false;
    $appearance.lightColorSchemeId = "colorscheme:clean_tidyblue_light";
    $appearance.darkColorSchemeId = "colorscheme:clean_tidyoxide_dark";
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
    onclick={(event) => {
      event.stopPropagation();
      toggle();
    }}
  >
    <div
      class={cn(
        "h-[28px] w-[28px] border border-fgs1 bg-bgs2 rounded-[48px] absolute transition-transform",
        isNight && "right-0 animate-bounce-r",
        !isNight && "left-0 animate-bounce-l"
      )}
    ></div>
    <SvgIcon icon="ph:sun" size={Size.sm} />
    <SvgIcon icon="ph:moon" size={Size.sm} />
  </button>
</div>
