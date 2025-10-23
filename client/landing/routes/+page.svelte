<script lang="ts">
  import BottomCta from "@21n/landing/shared/bottomCta/BottomCta.svelte";
  import HeroSection from "@21n/landing/shared/HeroSection.svelte";
  import Highlights from "@21n/landing/shared/highlights/Highlights.svelte";
  import Testimonials from "@21n/landing/shared/testimonials/Testimonials.svelte";
  import {
    currentProductsStore,
    landing,
    org
  } from "@21n/landing/shared/store/shared.store";
  import HeroVideoV2 from "@21n/landing/shared/elements/HeroVideoV2.svelte";
  import Features from "@21n/landing/shared/features/Features.svelte";
  import PageSeo from "@21n/landing/shared/seo/PageSEO.svelte";
  import GridItemsSection from "@21n/landing/shared/grid/GridItemsSection.svelte";
  import TileItemsSection from "@21n/landing/shared/tile/TileItemsSection.svelte";
  import type { IGridItem, ITileItem } from "@21n/landing/shared/landing.type";

  export let data;
  const whitePaperUrl = org.whitepaper;
  let corePrinciples: IGridItem[] = [
    {
      icon: "fluent-emoji:astronaut",
      title: "Truly 21st century native",
      description:
        "We named our organization '21n' to remind us about how an organization should be running in this century every single step of the way, and that's what we are striving to be.",
      href: whitePaperUrl
    },
    {
      icon: "fluent-emoji:globe-showing-europe-africa",
      title: "Triple bottom line",
      description:
        "As a conscious organization, we harness the power of business to improve lives and drive progress, all while keeping people and the planet at the forefront of our mission.",
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
    })
  ];
</script>

{#if data.metadata}
  <PageSeo data={data.metadata} />
{/if}
{#if data.heroInputs}
  <HeroSection heroInputs={data.heroInputs} />
{/if}
{#if data.isProduct}
  {#if data.heroVideoFrameUrl && data.heroVideoUrl}
    <HeroVideoV2
      url={data.heroVideoUrl}
      deviceImages={data.deviceImages}
      frameImage={data.heroVideoFrameUrl}
    />
  {/if}
  {#if data.highlights && data.highlights.length > 0}
    <Highlights
      highlights={data.highlights}
      title="Exceptional throughout"
      subtitle="From interface to infrastructure, user need alignment is at the core of our approach"
    />
  {/if}
  {#if data.featureSection && data.features && data.features.length > 0}
    <Features
      features={data.features}
      title={data.featureSection.title}
      subtitle={data.featureSection.body}
    />
  {/if}
  {#if data.testimonials && data.testimonials.length > 0}
    <Testimonials
      testimonials={data.testimonials}
      title="Join the community"
      subtitle={`Discover what our community has to say about their ${data.product} experience.`}
    />
  {/if}
  {#if data.bottomCtaBody}
    <BottomCta
      deviceImages={data.deviceImages}
      body={data.bottomCtaBody}
      primaryAction={{ isDownloadButton: true, type: "primary" }}
      secondaryAction={{
        label: "See all downloads",
        icon: "arrowright",
        href: $landing.urls.downloads?.all,
        type: "secondary"
      }}
    />
  {/if}
{:else}
  <GridItemsSection
    items={corePrinciples}
    title="Our Core principles"
    {whitePaperUrl}
  />
  <TileItemsSection items={products} title="Our products" />
{/if}
