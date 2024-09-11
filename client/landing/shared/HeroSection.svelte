<script lang="ts">
  import { goto } from "$app/navigation";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
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

<Section class={cn("relative justify-center", className)}>
  <div
    class={cn(
      "flex flex-col items-center text-center",
      !$isProductsPage && "justify-center -mt-32",
      $isProductsPage && "mt-20"
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
          "text-h2 mo:text-base font-medium leading-9 mo:leading-5 h-[72px] mo:h-[66px] mo:w-[303px] mt-4",
          !$isProductsPage && "w-[861px]",
          $isProductsPage && "w-[994px]"
        )}
      >
        {label}
      </p>
    {/if}
    {#if $view.isPortrait}
      <div
        class="flex items-center justify-end w-[138px] h-[36px] border-b pb-0 mt-6"
        on:click={() => ($isProductsPanelOpen = true)}
        on:keypress
      >
        <p class="text-[16px] leading-9 text-center">See our products</p>
        <SvgIcon icon="long-arrow-right" size={Size.sm} class="ml-1" />
      </div>
    {/if}
  </div>
  {#if $view.isPortrait}
    <DayAndNightToggle class="absolute bottom-12" />
  {:else if heroInputs.btn1 && heroInputs.btn2}
    <div class="flex w-[1110px] mo:w-[342px] justify-center gap-16 mt-14">
      <Button
        type="secondary"
        label={heroInputs.btn1.label}
        QRURL={heroInputs.btn1.iosDownloadUrl}
        iconPosition="end"
        on:click={() => {
          const url = heroInputs?.btn1?.iosDownloadUrl;
          if (url) {
            goto(url);
          }
        }}
      />
      <Button
        type="secondary"
        label={heroInputs.btn2.label}
        icon={heroInputs.btn2.icon}
        on:click={() => {
          const url = heroInputs?.btn2?.macDownloadUrl;
          if (url) {
            goto(url);
          }
        }}
      />
    </div>
  {:else}
    <Pulldown class="absolute bottom-12" />
  {/if}
  {#if $isProductsPage}
    <div class="relative w-[1046px] h-[590px] mt-[178px]">
      {#if !isVideoPlaying}
        <img
          src="https://img.youtube.com/vi/tktyAa_bWiY/maxresdefault.jpg"
          alt="Video Thumbnail"
          class="w-full h-full object-cover cursor-pointer"
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
