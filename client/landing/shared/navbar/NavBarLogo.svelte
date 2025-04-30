<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITopNavBar } from "../landing.type";
  export let topNavBarValues: ITopNavBar;
  import view from "$lib/client/stores/view.store";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { isProductPage } from "../store/shared.store";
  export let size: Size.sm | Size.md = Size.md;
</script>

<button
  class="flex items-center gap-1"
  on:click={() => (window.location.href = "/")}
>
  {#if topNavBarValues.icon}
    {@const icon = topNavBarValues.icon}
    {@const size = $view.isPortrait
      ? $isProductPage
        ? Size.lg
        : Size.xxl
      : $isProductPage
        ? Size.xxl
        : "5xl"}
    {@const className =
      "mr-2 border " + $isProductPage
        ? ""
        : $view.isPortrait
          ? "relative top-5"
          : ""}
    <SvgIcon {icon} {size} isRenderRaw={true} />
  {/if}
  <div class="flex flex-col">
    <!-- {#if $view.isPortrait}
      <button
        class={cn(
          "text-[11px] font-medium leading-none text-fgs3 w-[54px]",
          $isProductPage && "visible",
          !$isProductPage && "invisible"
        )}
        on:click={() =>
          (window.location.href = "https://blanklabs.org")}
      >
        21n
        <div class="h-px bg-dividerHorizontal mt-[2px]" />
      </button>
    {/if} -->
    {#if topNavBarValues.title}
      {@const title = topNavBarValues.title}
      <p
        class={cn({
          "text-base": size === Size.sm,
          "text-h3": size === Size.md
        })}
      >
        {title}
      </p>
    {/if}
  </div>
</button>
