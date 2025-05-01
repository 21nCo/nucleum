<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { fly } from "svelte/transition";
  import type { ITopNavBar } from "../landing.type";
  import NavBarCta from "./NavBarCta.svelte";
  import NavBarLogo from "./NavBarLogo.svelte";
  import NavMenu from "./NavMenu.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  export let topNavBarValues: ITopNavBar;
  export let isStickied: boolean = false;
  export let isShowCta: boolean = false;
</script>

<div
  class={cn(
    "fixed inset-x-0 top-0 mx-auto w-fit h-12 mt-3 border border-brs2 rounded-full z-50 flex items-center px-2",
    {
      "border-brs3 shadow-lg bg-bgs1": isStickied,
      "border-transparent": !isStickied
    }
  )}
>
  {#if isShowCta}
    <div class="flex gap-4 w-fit h-full" in:fly={{ x: -10, duration: 500 }}>
      <NavBarLogo {topNavBarValues} size={Size.sm} />
      <Divider orientation={Orientation.Vertical} />
    </div>
  {/if}
  <div class="flex items-center justify-center gap-2 h-full w-full px-6">
    <NavMenu {topNavBarValues} isStickedContext={isStickied} />
  </div>
  {#if isShowCta}
    <div class="w-fit" in:fly={{ x: 10, duration: 500 }}>
      <NavBarCta cta={topNavBarValues.cta} />
    </div>
  {/if}
</div>
