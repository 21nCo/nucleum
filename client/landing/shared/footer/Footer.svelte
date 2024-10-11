<script lang="ts">
  import { onMount } from "svelte";
  import type { IListItem, ITileItem } from "../Landing.types";
  import Section from "../Section.svelte";
  import Button from "../elements/Button.svelte";
  import Box from "./Box.svelte";
  import ListWithTitle from "./ListWithTitle.svelte";
  import { paintQRCode } from "$lib/client/utils/ui.utils";
  import { goto } from "$app/navigation";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import { Theme } from "$lib/client/types/appearance.type";
  import QrElement from "../elements/QRElement.svelte";
  import { isProductPage, isProductsPanelOpen } from "../store/shared.store";
  import ButtonAsLink from "../ButtonAsLink.svelte";
  export let products: IListItem[];
  export let url: string = "https://blanklabs.org";

  let isHovering = false;
  let canvas: HTMLCanvasElement;
  let iconColors = {
    bgLight: "hsla(0, 0%, 92%, 1)",
    bgDark: "hsla(0, 0%, 20%, 1)",
    fgDark: "hsla(0, 0%, 100%, 1)",
    fgLight: "hsla(0, 0%, 20%, 1)"
  };
  function handleHover(index: number) {
    socials[index].isHovered = true;
  }

  function handleLeave(index: number) {
    socials[index].isHovered = false;
  }
  let socials = [
    {
      href: "https://twitter.com/blanklabs",
      icon: "x",
      primary: "hsla(0, 0%, 0%, 1)",
      isHovered: false
    },
    {
      href: "https://discord.gg/blanklabs",
      icon: "discord",
      primary: "hsla(235, 86%, 65%, 1)",
      isHovered: false
    },
    {
      href: "https://github.com/blanklabs",
      icon: "youtube",
      primary: "hsla(0, 100%, 50%, 1)",
      isHovered: false
    },
    {
      href: "https://www.linkedin.com/company/blanklabs",
      icon: "linkedin",
      primary: "hsla(200, 100%, 35%, 1)",
      isHovered: false
    }
  ];
  let joinUs = {
    title: "Join us",
    href: "https://tally.so/r/wLzN8j",
    description:
      "Become a part of Blank and join us in shaping a more sustainable and connected future through innovation and collaboration, making a difference by empowering people and preserving our planet."
  };

  let ourStory = {
    title: "Our Story",
    href: "https://tally.so/r/wLzN8j"
  };
  let information = [
    { title: "Information" },
    {
      title: "Help center",
      href: "https://docs.blanklabs.org/soft"
    },
    {
      title: "Privacy policy",
      href: "https://docs.blanklabs.org/soft"
    },
    {
      title: "Terms and conditions",
      href: "https://docs.blanklabs.org/soft"
    }
  ];
  const combinedLI = [
    { title: "Infomration" },
    joinUs,
    ourStory,
    ...information.slice(1),
    ...products
  ];
</script>

<Section>
  <div class="flex flex-col items-center gap-7 w-full">
    {#if $view.isPortrait}
      <div class="flex flex-col bg-bgs2 w-full rounded-[20px] p-7">
        <ListWithTitle items={combinedLI} />
        <ButtonAsLink
          class="mt-[16px] ml-[0px]"
          label="See all products"
          on:click={() => ($isProductsPanelOpen = true)}
        />
      </div>
    {:else}
      <div class="w-full flex gap-6 justify-between">
        <Box>
          <div class="flex h-full flex-col items-center justify-center gap-9">
            <QrElement {url} enableHover={false} />
            <p class="text-[24px] font-medium leading-[33px]">
              Scan & Download
            </p>
          </div>
        </Box>
        <Box>
          <ListWithTitle items={information} />
        </Box>
        <Box>
          <ListWithTitle items={products} />
          <ButtonAsLink
            class="mt-[16px] ml-[0px]"
            label="See all products"
            on:click={() => ($isProductsPanelOpen = true)}
          />
        </Box>
      </div>
      <div class="w-full flex gap-x-7">
        <Box backgroundImage="our-story">
          <div class="w-full h-full flex items-center justify-center">
            <Button
              type="secondary"
              label="Our story"
              class=""
              isShort={true}
              on:click={() => {
                window.location.href = "https://docs.blanklabs.org/soft";
              }}
            />
          </div>
        </Box>
        <div
          class="flex flex-col items-center justify-center gap-9 w-full h-[356px] bg-bgs2 rounded-[20px] p-7"
        >
          <p
            class="text-fgs2 text-[20px] leading-[28px] font-normal text-center"
          >
            {joinUs.description}
          </p>
          <Button
            label={joinUs.title}
            isShort={true}
            class="text-[20px]"
            on:click={() => (window.location.href = joinUs.href)}
          />
        </div>
      </div>
    {/if}
    <div
      class="w-full mo:max-w-[390px] tp:max-w-full rounded-[20px] flex mo:flex-col mo:gap-y-4 items-center bg-bgs2 px-7 py-4 mo:px-0 mo:py-4"
    >
      {#if !$view.isPortrait}
        <p>
          {#if $isProductPage}
            <span>Built at</span>
          {/if}
          21n
        </p>
      {/if}
      <div class="mx-auto flex gap-5 mo:gap-3">
        {#each socials as social, index}
          <div
            style="--bg-color:{social.isHovered
              ? social.primary
              : $appearance.theme == Theme.DARK
                ? iconColors.bgDark
                : iconColors.bgLight};--fg-color:{social.isHovered
              ? iconColors.bgLight
              : $appearance.theme == Theme.DARK
                ? iconColors.fgDark
                : iconColors.fgLight};
                height:32px;width:32px;"
            on:mouseenter={() => handleHover(index)}
            on:mouseleave={() => handleLeave(index)}
            role="button"
            tabindex="0"
          >
            <SvgIcon icon={social.icon} size={Size.lg} />
          </div>
        {/each}
      </div>
      <p>HQ Hyderabad</p>
    </div>
  </div>
</Section>
