<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITopNavBar } from "../landing.type";
  export let topNavBarValues: ITopNavBar;
  import view from "$lib/client/stores/view.store";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { isProductPage, landing } from "../store/shared.store";
  export let size: Size.sm | Size.md = Size.md;
</script>

<button
  class="flex items-center gap-1"
  on:click={() => {
    landing.openLink("/");
  }}
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
    <span
      class={cn({
        "w-6": topNavBarValues.title !== undefined,
        "w-10": !topNavBarValues.title
      })}
    >
      <SvgIcon {icon} {size} isRenderRaw={true} />
    </span>
  {/if}
  <div class="flex flex-col">
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
