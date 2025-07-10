<script lang="ts">
  import "$lib/client/app.css";
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";
  import type { IMetadata } from "$lib/client/layout/metadata.type";
  import type {
    IFooter,
    ILandingProductUrls,
    ITopNavBar
  } from "../shared/landing.type";
  import {
    org,
    landing,
    isProductsPanelOpen
  } from "../shared/store/shared.store";
  const urls: ILandingProductUrls = {
    socials: {
      twitter: org.twitter
    }
  };
  const topNavBarValues: ITopNavBar = {
    icon: "21n-temp",
    items: [
      {
        label: "Products",
        href: org.docs,
        callback: () => {
          $isProductsPanelOpen = true;
        }
      },
      { label: "Discord", href: org.discord },
      { label: "White paper", href: org.whitepaper }
    ],
    cta: [
      {
        label: "Contribute",
        icon: "ph:github-logo-light",
        href: org.github,
        type: "primary"
      }
    ]
  };
  let footerValues: IFooter = {
    blogUrl: org.blog,
    twitterUrl: urls.socials?.twitter
  };
  let metadata: IMetadata = {
    title: "21n - 21st century native organization",
    description:
      "21st century native organization. Building impressive products with triple bottom line at its core.",
    keywords:
      "21n, 21 native, phi native, phinative, 21st century native, organization, products, triple bottom line",
    url: "https://21n.org",
    image: "https://cdn.21n.co/21n/ogImage.png"
  };
  landing.load(urls);
</script>

<BlankLandingLayout {topNavBarValues} {footerValues} {metadata}>
  <slot />
</BlankLandingLayout>
