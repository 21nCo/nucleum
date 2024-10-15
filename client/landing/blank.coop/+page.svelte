<script lang="ts">
  import Image from "$lib/client/icons/Image.svelte";
  import Footer from "../shared/footer/Footer.svelte";
  import GridItemsSection from "../shared/grid/GridItemsSection.svelte";
  import HeroSection from "../shared/HeroSection.svelte";
  import type {
    IHeroInputs,
    IGridItem,
    ITileItem,
    IListItem
  } from "../shared/Landing.types";
  import {
    currentProductsStore,
    upcomingProductsStore
  } from "../shared/store/shared.store";
  import TileItemsSection from "../shared/tile/TileItemsSection.svelte";

  const whitePaperUrl = "https://papers.21n.io/soft";

  let heroInputs: IHeroInputs = {
    tagline: "21st century native company",
    description: "Pioneering sustainable technology for the modern era"
  };

  let corePrinciples: IGridItem[] = [
    {
      icon: "fluent-emoji:astronaut",
      title: "Truly 21st century native",
      description:
        "We named our company '21n' to remind us about how a company should be running in this century every single step of the way, and that's what we are striving to be.",
      href: whitePaperUrl
    },
    {
      icon: "fluent-emoji:globe-showing-europe-africa",
      title: "Triple bottom line",
      description:
        "As a conscious company, we harness the power of business to improve lives and drive progress, all while keeping people and the planet at the forefront of our mission.",
      href: whitePaperUrl
    },
    {
      icon: "fluent-emoji:glowing-star",
      title: "Cooperative",
      description:
        "We are a worker-consumer cooperative where previously uncommon practices, such as users owning the products they use and voting to end a product, are the norm.",
      href: whitePaperUrl
    },
    {
      icon: "fluent-emoji:rocket",
      // icon: "fluent-emoji:potted-plant ",
      title: "Incubator",
      description:
        "Unlike traditional companies, each member has the opportunity to incubate their own projects and even self-disrupt our existing products.",
      href: whitePaperUrl
    }
    // {
    //   icon: "fluent-emoji:world-map",
    //   // icon: "fluent-emoji:small-airplane",
    //   title: "Global",
    //   description:
    //     "As digital nomads, we believe that the future of work is global and remote. We are neither bound by location & timezones nor by the traditional 9-5 workday.",
    //   href: "https://docs.blanklabs.org/soft"
    // },
    // {
    //   icon: "fluent-emoji:unlocked",
    //   // icon: "fluent-emoji:broken-chain",
    //   title: "Decentralized",
    //   description:
    //     "We believe in the power of decentralization to bring more freedom and control to people's lives. So we trust algorithms over managers.",
    //   href: "https://docs.blanklabs.org/soft"
    // }
  ];

  let products: ITileItem[] = [
    ...$currentProductsStore.slice(0, 2).map((x) => {
      return {
        title: x.title,
        image: x.image,
        description: x.label,
        href: x?.href
      };
    }),
    ...$upcomingProductsStore.slice(0, 2).map((x) => {
      return {
        title: x.title,
        description: x.label,
        href: x?.href
      };
    })
  ];
</script>

<HeroSection {heroInputs} />

<GridItemsSection
  items={corePrinciples}
  title="Our Core principles"
  {whitePaperUrl}
/>

<TileItemsSection items={products} title="Our products" />
