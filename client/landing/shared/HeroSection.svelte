<script lang="ts">
  import { goto } from "$app/navigation";
  // import EarlyAccess from "$lib/client/components/EarlyAccess.svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import { Theme } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import BackgroundPattern from "./BackgroundPattern.svelte";
  import ButtonAsLink from "./ButtonAsLink.svelte";
  import DayAndNightToggle from "./DayAndNightToggle.svelte";
  import type { IHeroInputs } from "./Landing.types";
  import Button from "./elements/Button.svelte";
  import Pulldown from "./play/Pulldown.svelte";
  import { isProductPage, isProductsPanelOpen } from "./store/shared.store";
  export let isComingSoon = false;
  export let heroInputs: IHeroInputs;
  export { className as class };

  $: greenGradient =
    $appearance.theme === Theme.DARK
      ? "rgba(97, 255, 113, 0.30)"
      : "rgba(97, 255, 113, 0.2)";
  // let gradientColor2 = "rgba(240, 248, 255, 0.7)";
  // let gradientColor2 = "rgba(127, 227, 154, 0.3)";
  // let gradientColor2 = "rgba(127, 184, 227, 0.3)";
  // let gradientColor2 = "rgba(97, 255, 113, 0.15)";

  $: monoGradient =
    $appearance.theme === Theme.DARK
      ? "rgba(240, 248, 255, 0.2)"
      : "rgba(0,0,0, 0.1)";

  $: mainGradient = monoGradient;
  $: gradientColor2 = monoGradient;

  export let dev_gradientBgVariant:
    | "one-center"
    | "two-center-sides"
    | "two-corners"
    | "none" = "one-center";
</script>

<div
  class="relative flex justify-center -mt-[80px] h-full w-full overflow-clip"
>
  <div
    class="w-[1110px] 2k:w-[1500px] max-w-full flex flex-col gap-20 justify-center items-center"
  >
    <!-- <div
      style="background: radial-gradient(circle at 50% 50%, rgba(39,61,38,00.5) 0%, rgba(39,61,38,0) 50%);"
      class="absolute w-[800px] h-[800px] -top-[180px] -left-[170px] z-0 pointer-events-none rounded-full"
    ></div>
    <div
      style="background: radial-gradient(circle at 50% 50%, rgba(39,61,38,0.5) 0%, rgba(39,61,38,0) 40%);"
      class="absolute w-[800px] h-[800px] -top-[100px] -right-[120px] z-0 pointer-events-none"
    ></div> -->

    {#if dev_gradientBgVariant === "one-center" || $view.isPortrait}
      <div
        class={cn(
          "absolute mo:w-[600px] mo:h-[600px] rounded-full opacity-60",
          {
            "w-[1100px] h-[1100px]": $appearance.theme === Theme.DARK,
            "w-[1000px] h-[1000px]": $appearance.theme !== Theme.DARK
          }
        )}
        style="
background: radial-gradient(circle, {mainGradient} 0%, transparent 70%);
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
"
      ></div>
    {:else if dev_gradientBgVariant === "two-center-sides"}
      <div
        class={cn("absolute rounded-full opacity-60", {
          "w-[1100px] h-[1100px]": $appearance.theme === Theme.DARK,
          "w-[1000px] h-[1000px]": $appearance.theme !== Theme.DARK
        })}
        style="
background: radial-gradient(circle, {mainGradient} 0%, transparent 70%);
top: 50%;
left: 25%;
transform: translate(-50%, -50%);
"
      ></div>

      <div
        class={cn("absolute rounded-full opacity-60", {
          "w-[900px] h-[900px]": $appearance.theme === Theme.DARK,
          "w-[800px] h-[800px]": $appearance.theme !== Theme.DARK
        })}
        style="
background: radial-gradient(circle, {gradientColor2} 0%, transparent 70%);
top: 50%;
left: 75%;
transform: translate(-50%, -50%);
"
      ></div>
    {:else if dev_gradientBgVariant === "two-corners"}
      <div
        class="absolute w-[800px] h-[800px] rounded-full opacity-60"
        style="
    background: radial-gradient(circle, {mainGradient} 0%, transparent 70%);
    top: -400px;
    left: -200px;
  "
      ></div>

      <div
        class="absolute w-[600px] h-[600px] rounded-full opacity-60 overflow-clip"
        style="
    background: radial-gradient(circle, {gradientColor2} 0%, transparent 70%);
    bottom: -300px;
    right: -100px;
  "
      ></div>
    {/if}
    <BackgroundPattern mode={$appearance.theme} />
    {#if $appearance.theme === Theme.DARK}
      <!-- <div class="absolute inset-0 bg-black/10"></div> -->
    {:else}
      <div class="absolute inset-0 backdrop-blur-xl"></div>
      <div class="absolute inset-0 bg-white/10"></div>
    {/if}
    <div
      class="flex flex-col w-full gap-6 dp:gap-8 2k:gap-12 items-center text-center relative z-10"
    >
      {#if heroInputs.tagline}
        {@const title = heroInputs.tagline}
        <div
          class={cn(
            " tp:text-[60px] lp:text-[72px] dp:text-[78px] 2k:text-[96px] lp:leading-[78px] dp:leading-[98px] font-black max-w-9/10",
            {
              "mo:text-[26px] tp:text-[50px] mo:leading-9 tp:leading-[60px] mo:w-[350px]":
                $isProductPage,
              "mo:text-[36px] mo:leading-[50px] mo:w-[342px]": !$isProductPage
            }
          )}
          style="font-family: 'Avenir', 'Shared', sans-serif;"
        >
          {title}
        </div>
      {/if}
      {#if heroInputs.description}
        {@const label = heroInputs.description}
        <p
          class={cn(
            "mo:text-base tp:text-h3 text-h2 leading-9 mo:leading-5 h-[72px] mo:h-[66px] mo:w-[303px] max-w-8/10",
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
          {type}
          label={heroInputs.btn1.label}
          QRURL={heroInputs.btn1.iosDownloadUrl}
          iconPosition="end"
          on:click={() => {
            const url = heroInputs?.btn1?.iosDownloadUrl;
            console.log(url);
            if (url) {
              window.location.href = url;
            }
          }}
        />
        {#if !$view.isPortrait}
          <Button
            type="secondary"
            label={heroInputs.btn2.label}
            icon={heroInputs.btn2.icon}
            on:click={() => {
              const url = heroInputs?.btn2?.macDownloadUrl;
              if (url) {
                window.location.href = url;
              }
            }}
          />
        {/if}
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
