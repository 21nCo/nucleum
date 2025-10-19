<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import type { ILandingProductUrls } from "@21n/landing/shared/landing.type";
  import { landing } from "@21n/landing/shared/store/shared.store";

  export let type: "resources" | "compare";
  let urls: ILandingProductUrls = $landing.urls;
  const resources = [
    {
      label: "Features",
      icon: "docs",
      href: urls?.features
    },
    {
      label: "Tutorials",
      icon: "youtube",
      href: urls?.tutorials
    },
    {
      label: "FAQs",
      icon: "question",
      href: urls?.faqs
    },
    {
      label: "Changelog",
      icon: "changelog",
      href: urls?.changelog
    },
    {
      label: "Roadmap",
      icon: "map",
      href: urls?.roadmap
    }
  ];
</script>

{#if type === "resources"}
  <div
    class="grid grid-cols-3 gap-4 w-96 h-52 bg-bgs1 p-6 border border-brs3 rounded-md"
  >
    {#each resources as item}
      <button
        class="flex flex-col justify-center items-center p-2 gap-1 bg-bgs1 rounded-md hover:bg-bgs2 border border-brs3"
        on:click={() => landing.openLink(item.href ?? "")}
      >
        <SvgIcon icon={item.icon} />
        <div class="text-b2 text-fgs2">{item.label}</div>
      </button>
    {/each}
  </div>
{:else}
  <!-- TODO -->
{/if}
