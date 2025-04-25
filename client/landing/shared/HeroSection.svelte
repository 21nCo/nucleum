<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import ButtonAsLink from "./ButtonAsLink.svelte";
  import DayAndNightToggle from "./DayAndNightToggle.svelte";
  import type { IHeroInputs } from "./Landing.types";
  import Button from "./elements/Button.svelte";
  import HeroBackground from "./hero/HeroBackground.svelte";
  import Pulldown from "./play/Pulldown.svelte";
  import { isProductPage, isProductsPanelOpen } from "./store/shared.store";
  export let isComingSoon = false;
  export let heroInputs: IHeroInputs;
  export { className as class };
</script>

<div class="relative flex justify-center h-[80vh] w-full overflow-clip">
  <!-- <HeroBackground /> -->
  <div
    class="w-[1110px] 2k:w-[1500px] max-w-full flex flex-col gap-8 justify-center items-center"
  >
    <div
      class="flex flex-col w-full gap-3 items-center text-center relative z-10"
    >
      {#if heroInputs.tagline}
        {@const title = heroInputs.tagline}
        <div
          class={cn("leading-[73px] font-bold max-w-9/10", {
            "mo:text-[26px] tp:text-[56px] mo:leading-9 tp:leading-[60px] mo:w-[350px]":
              $isProductPage,
            "mo:text-[36px] mo:leading-[50px] mo:w-[342px]": !$isProductPage
          })}
          style="font-family: 'Avenir', 'Shared', sans-serif;"
        >
          {title}
        </div>
      {/if}
      {#if heroInputs.description}
        {@const label = heroInputs.description}
        <p
          class={cn(
            "text-[17px] leading-9 mo:leading-5 mo:w-[303px] max-w-8/10",
            !$isProductPage && "w-[861px]",
            $isProductPage && "w-[994px]"
          )}
        >
          {label}
        </p>
      {/if}
      {#if $view.isPortrait && !$isProductPage}
        <ButtonAsLink
          label="See our products"
          on:click={() => ($isProductsPanelOpen = true)}
        />
      {/if}
    </div>
    {#if $view.isPortrait && !$isProductPage}
      <DayAndNightToggle
        class="absolute bottom-12 flex w-full justify-center"
      />
    {:else if heroInputs.btn1 && heroInputs.btn2}
      {@const type = $view.isPortrait ? "primary" : "secondary"}
      <div
        class="flex w-[1110px] mo:w-[342px] max-w-full justify-center gap-16 relative z-10"
      >
        <Button
          label={heroInputs.btn1.label}
          on:click={() => {
            const url = heroInputs?.btn1?.iosDownloadUrl;
            console.log(url);
            if (url) {
              window.location.href = url;
            }
          }}
        />
      </div>
    {:else if isComingSoon}
      <!-- <EarlyAccess version="V3" url={heroInputs.earlyAccessUrl} /> -->
    {:else}
      <div class="absolute bottom-12 flex w-full justify-center">
        <Pulldown />
      </div>
    {/if}
  </div>
</div>
