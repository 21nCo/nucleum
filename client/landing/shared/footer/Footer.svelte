<script lang="ts">
  import { onMount } from "svelte";
  import type { IListItem, ITileItem } from "../Landing.types";
  import Section from "../Section.svelte";
  import Button from "../elements/Button.svelte";
  import Box from "./Box.svelte";
  import ListWithTitle from "./ListWithTitle.svelte";
  import view from "$lib/client/stores/view.store";
  import { paintQRCode } from "$lib/client/utils/ui.utils";
  export let products: IListItem[];
  export let url: string = "https://pointron.io";

  let isHovering = false;
  let canvas: HTMLCanvasElement;

  onMount(async () => {
    await paintQRCode(canvas, url, 122);
  });
  let socials = [
    {
      href: "https://twitter.com/blanklabs",
      icon: "twitter"
    },
    {
      href: "https://discord.gg/blanklabs",
      icon: "discord"
    },
    {
      href: "https://github.com/blanklabs",
      icon: "github"
    },
    {
      href: "https://www.linkedin.com/company/blanklabs",
      icon: "linkedin"
    }
  ];
  let information = [
    {
      title: "Our story",
      href: "https://docs.blanklabs.org/soft"
    },
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
</script>

<Section>
  <div class="flex flex-col gap-7">
    <div class="w-full flex gap-x-7">
      <Box>
        <div class="flex h-full flex-col items-center justify-center gap-9">
          <canvas
            on:mouseenter={() => (isHovering = true)}
            on:mouseleave={() => (isHovering = false)}
            bind:this={canvas}
            class:scale-[1.4]={isHovering}
            class:scale-[1]={!isHovering}
            class="border-2 transition-transform duration-300 ease-in-out origin-center"
          />
          <p class="text-[24px] font-medium leading-[33px]">Scan & Download</p>
        </div>
      </Box>
      <Box>
        <ListWithTitle title="Information" items={information} />
      </Box>
      <Box>
        <ListWithTitle title="Products" items={products} />
      </Box>
    </div>
    <div class="w-full flex gap-x-7">
      <Box backgroundImage="our-team" />
      <div
        class="flex flex-col items-center justify-center gap-9 flex-grow-0 w-[806px] h-[356px] bg-bgs2 rounded-[20px] p-7"
      >
        <p class="text-fgs2 text-[20px] leading-[28px] font-normal text-center">
          Become a part of Blank and join us in shaping a more sustainable and
          connected future through innovation and collaboration, making a
          difference by empowering people and preserving our planet.
        </p>
        <Button label="Join us" href="https://tally.so/r/wLzN8j" />
      </div>
    </div>
    <div class="w-[1222px] h-[72px] rounded-[20px] flex bg-bgs2 p-7">
      <p>Blank.coop</p>
      <div class="mx-auto flex gap-5">
        {#each socials as social}
          <a
            href={social.href}
            class="text-fgs1 text-[20px] font-medium leading-[28px] hover:text-aps1"
            >{social.icon}</a
          >
        {/each}
      </div>
      <p>HQ Hyderabad</p>
    </div>
  </div>
</Section>
