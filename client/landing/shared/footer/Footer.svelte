<script lang="ts">
  import { onMount } from "svelte";
  import type { IFooter, IListItem, ITileItem } from "../landing.type";
  import Button from "../elements/Button.svelte";
  import Box from "./Box.svelte";
  import ListWithTitle from "./ListWithTitle.svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import { Theme } from "$lib/client/types/appearance.type";
  import QrElement from "../elements/QRElement.svelte";
  import {
    isProductPage,
    isProductsPanelOpen,
    landing,
    org
  } from "../store/shared.store";
  import ButtonAsLink from "../ButtonAsLink.svelte";
  export let products: IListItem[];
  export let footerValues: IFooter;
  export let appStoreUrl: string =
    "https://apps.apple.com/in/developer/blank-labs-private-limited/id1621745929";

  const ourStoryBgImage =
    import.meta.env.VITE_STATIC_URL + "/images/our-story2.png";

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
      href: footerValues.gitUrl ?? "https://github.com/21nCo",
      icon: "gitfooter",
      primary: "hsla(0, 0%, 0%, 1)",
      isHovered: false
    },
    {
      href: footerValues.twitterUrl ?? "https://x.com/21nOrg",
      icon: "xfooter",
      primary: "hsla(0, 0%, 0%, 1)",
      isHovered: false
    },
    {
      href: footerValues.discordUrl ?? "https://discord.com/invite/9HJqKYTZKg",
      icon: "discordfooter",
      primary: "hsla(235, 86%, 65%, 1)",
      isHovered: false
    },
    {
      href: footerValues.youtubeUrl ?? "https://www.youtube.com/@21nOrg",
      icon: "youtubefooter",
      primary: "hsla(0, 100%, 50%, 1)",
      isHovered: false
    },
    {
      href: footerValues.linkedinUrl ?? "https://www.linkedin.com/company/21n",
      icon: "linkedinfooter",
      primary: "hsla(200, 100%, 35%, 1)",
      isHovered: false
    }
  ];
  let joinUs = {
    title: "Read our white paper",
    href: org.whitepaper,
    description:
      "Discover our mission of building technology with triple bottom line at our core."
  };

  let ourStory = {
    title: "Our Story",
    href: "/about"
  };
  const polices = [
    { title: "Policies" },
    {
      title: "Privacy policy",
      href: "/privacy"
    },
    {
      title: "Terms and conditions",
      href: "/tos"
    },
    {
      title: "Refund policy",
      href: "/policies/refundpolicy"
    }
  ];
  let information: any[] = [{ title: "Information" }];
  if ($isProductPage) {
    information.push({
      title: "Pricing",
      href: "/pricing"
    });
  }
  if (footerValues.helpUrl) {
    information.push({
      title: "Help center",
      href: footerValues.helpUrl
    });
  }
  if (footerValues.docsUrl) {
    information.push({
      title: "Documentation",
      href: footerValues.docsUrl
    });
  }
  if (footerValues.roadmapUrl) {
    information.push({
      title: "Roadmap",
      href: footerValues.roadmapUrl
    });
  }
  if (footerValues.changelogUrl) {
    information.push({
      title: "Changelog",
      href: footerValues.changelogUrl
    });
  }
  if (footerValues.youtubeUrl) {
    information.push({
      title: "Tutorials",
      href: footerValues.youtubeUrl
    });
  }
  if (footerValues.blogUrl) {
    information.push({
      title: "Blog",
      href: footerValues.blogUrl
    });
  }
  const combinedLI = [
    { title: "Information" },
    joinUs,
    ourStory,
    ...information.slice(1),
    ...products
  ];
</script>

<footer class="flex flex-col items-center gap-6 w-full pb-20">
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
    <div class="w-full flex gap-6">
      <Box expansion="vertical">
        <div class="flex flex-col gap-12">
          <ListWithTitle items={information} />
          <ListWithTitle items={polices} />
        </div>
      </Box>

      <div class="flex flex-col gap-6">
        <div class="flex gap-6">
          <Box>
            <div class="flex h-full flex-col items-center justify-center gap-9">
              <QrElement
                url={footerValues.appStoreUrl ?? appStoreUrl}
                enableHover={false}
              />
              <p class="font-medium">Scan this for mobile app</p>
            </div>
          </Box>
          <Box>
            <ListWithTitle items={products} />
            <!-- <ButtonAsLink
              label="See all products"
              on:click={() => ($isProductsPanelOpen = true)}
            /> -->
          </Box>
        </div>

        <Box expansion="horizontal">
          <p class="text-fgs2 text-left">
            {joinUs.description}
          </p>
          <div class="w-fit">
            <Button
              label={joinUs.title}
              isShort={true}
              type="secondary"
              href={joinUs.href}
            />
          </div>
        </Box>
      </div>
    </div>
  {/if}
  <div
    class="w-full rounded-xl flex mo:flex-col mo:gap-y-4 items-center bg-bgs1 px-7 py-4 mo:px-0 mo:py-4 min-w-0 flex-1 text-b2 2k:text-lb2"
  >
    {#if !$view.isPortrait}
      <a
        class="flex items-center gap-2 text-fgs3"
        href={org.website}
        target="_blank"
      >
        {#if $isProductPage}
          <span class="-mb-0.5">Built at</span>
        {/if}
        <SvgIcon icon="21n-temp" size={Size.xl} />
      </a>
    {/if}
    <div class="flex mx-auto gap-5 mo:gap-3">
      {#each socials as social, index}
        <a
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
          tabindex="0"
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <SvgIcon icon={social.icon} size={Size.xl} />
        </a>
      {/each}
    </div>
    <p class="text-fgs3">
      <a href="https://21n.co" target="_blank"> 21n.co </a>| {org.incorporation}
    </p>
  </div>
</footer>
