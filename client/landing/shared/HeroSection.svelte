<script lang="ts">
  import { goto } from "$app/navigation";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import { Theme } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import ButtonAsLink from "./ButtonAsLink.svelte";
  import DayAndNightToggle from "./DayAndNightToggle.svelte";
  import type { IHeroInputs } from "./Landing.types";
  import Section from "./Section.svelte";
  import Button from "./elements/Button.svelte";
  import Pulldown from "./play/Pulldown.svelte";
  import { isProductsPage, isProductsPanelOpen } from "./store/shared.store";

  export let heroInputs: IHeroInputs;
  let className: string = "min-h-[93vh]";
  export { className as class };

  let isVideoPlaying = false;

  function playVideo() {
    isVideoPlaying = true;
  }
</script>

<Section class={cn("relative justify-center mo:min-h-[92vh]", className)}>
  <!-- {#if $appearance.theme === Theme.DARK && !$view.isPortrait}
    <div
      style="background: radial-gradient(circle at 50% 50%, rgba(39,61,38,00.5) 0%, rgba(39,61,38,0) 50%);"
      class="absolute w-[800px] h-[800px] -top-[180px] -left-[170px] z-0 pointer-events-none rounded-full"
    ></div>
    <div
      style="background: radial-gradient(circle at 50% 50%, rgba(39,61,38,0.5) 0%, rgba(39,61,38,0) 40%);"
      class="absolute w-[800px] h-[800px] -top-[100px] -right-[120px] z-0 pointer-events-none"
    ></div>
  {/if} -->
  <div
    class={cn(
      "flex flex-col items-center text-center",
      !$isProductsPage && "justify-center -mt-32",
      $isProductsPage && "mt-8"
    )}
  >
    {#if heroInputs.title}
      {@const title = heroInputs.title}
      <div
        class={cn(
          !$isProductsPage &&
            "text-[108px] mo:text-[36px] font-black leading-[148px] mo:leading-[50px] h-[148px] mo:h-[49px] w-[1110px] mo:w-[342px]",
          $isProductsPage &&
            "text-[82px] mo:text-[26px] font-black leading-[98px] mo:leading-9 h-[196px] mo:h-[72px] w-[1110px] mo:w-[350px]"
        )}
      >
        {title}
      </div>
    {/if}
    {#if heroInputs.label}
      {@const label = heroInputs.label}
      <p
        class={cn(
          "text-h2 mo:text-base font-medium mo:font-normal leading-9 mo:leading-5 h-[72px] mo:h-[66px] mo:w-[303px] mt-4",
          !$isProductsPage && "w-[861px]",
          $isProductsPage && "w-[994px]"
        )}
      >
        {label}
      </p>
    {/if}
    {#if $view.isPortrait && !$isProductsPage}
      <ButtonAsLink
        label="See our products"
        on:click={() => ($isProductsPanelOpen = true)}
      />
    {/if}
  </div>
  {#if $view.isPortrait && !$isProductsPage}
    <DayAndNightToggle class="absolute bottom-12" />
  {:else if heroInputs.btn1 && heroInputs.btn2}
    {@const type = $view.isPortrait ? "primary" : "secondary"}
    <div class="flex w-[1110px] mo:w-[342px] justify-center gap-16">
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
  {:else}
    <Pulldown class="absolute bottom-12" />
  {/if}
  {#if $isProductsPage}
    <div
      class="relative w-[1046px] mo:w-[343px] h-[590px] mo:h-[194px] mt-[40px] rounded-xl"
    >
      {#if !isVideoPlaying}
        <img
          src="https://img.youtube.com/vi/tktyAa_bWiY/maxresdefault.jpg"
          alt="Video Thumbnail"
          class="w-full h-full object-cover cursor-pointer rounded-xl"
        />
        <div class="absolute inset-0 flex items-center justify-center">
          <Button
            on:click={playVideo}
            icon="play"
            class="pl-6 pr-8"
            iconPosition="end"
          />
        </div>
      {:else}
        <iframe
          class="w-full h-full"
          src="https://www.youtube.com/embed/tktyAa_bWiY?autoplay=1&mute=1"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      {/if}
    </div>
  {/if}
</Section>
