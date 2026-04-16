<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import type { ITopNavBar } from "@21n/landing/shared/landing.type";
  let {
    topNavBarValues,
    size = Size.md,
  }: {
    topNavBarValues: ITopNavBar;
    size?: Size.sm | Size.md;
  } = $props();
  import view from "@21n/stores/view.store";
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { isProductPage, landing } from "@21n/landing/shared/store/shared.store";

</script>

<a class="flex items-center gap-1" href="/" title="Go to home">
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
</a>
