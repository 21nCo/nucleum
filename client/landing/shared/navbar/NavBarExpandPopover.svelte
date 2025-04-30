<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import type { ILandingProductUrls } from "../landing.type";
  import { landing } from "../store/shared.store";

  export let type: "resources" | "compare";
  let urls: ILandingProductUrls = $landing.urls;
  const resources = [
    {
      label: "Features",
      icon: "features",
      href: urls?.features
    },
    {
      label: "Tutorials",
      icon: "tutorials",
      href: urls?.tutorials
    },
    {
      label: "FAQs",
      icon: "faqs",
      href: urls?.faqs
    },
    {
      label: "Changelog",
      icon: "changelog",
      href: urls?.changelog
    }
  ];
</script>

{#if type === "resources"}
  <div
    class="grid grid-cols-3 gap-4 w-96 h-52 bg-bgs1 p-6 border border-brs3 rounded-md"
  >
    {#each resources as item}
      <button
        class="flex flex-col justify-center items-center gap-2 bg-bgs1 rounded-md hover:bg-bgs2 border border-brs3"
        on:click={() => landing.openLink(item.href ?? "")}
      >
        <!-- <SvgIcon icon={item.icon} /> -->
        <div>
          {item.label}
        </div>
      </button>
    {/each}
  </div>
{:else}
  <!-- TODO -->
{/if}
