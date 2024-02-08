<script>
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import CpThumbnail from "../settings/CPThumbnail.svelte";
  import AppNameWithVersion from "../settings/about/AppNameWithVersion.svelte";
  import ProductInfoFooter from "../settings/about/ProductInfoFooter.svelte";
  let config = [
    {
      section: "main",
      children: [
        "tutorial",
        "productguide",
        "chat",
        "call",
        "faqs",
        "downloads"
      ]
    },
    {
      section: "Product direction",
      children: ["changelog", "roadmap", "feedback", "requestfeature", "report"]
    },
    {
      section: "Community",
      children: ["discord", "opencollective", "twitter"]
    },
    {
      section: "Learn more",
      children: ["about", "privacy", "git", "credits"]
    }
  ];
</script>

<div class="flex flex-col gap-6 w-full h-full p-8 pb-12">
  <div class="flex w-full justify-between">
    <Text content="Help center" style={TextStyle.PAGE_HEADING} />
    <span class="flex flex-col items-end text-b3 text-fgs3">
      <AppNameWithVersion />
      <div>Updated 4 days ago</div>
    </span>
  </div>
  <div class="flex flex-col gap-12 w-full flex-grow overflow-auto py-6">
    {#each config as section}
      <div class="flex flex-col gap-2 items-start">
        {#if section.section != "main"}
          <!-- <Text content={section.section} style={TextStyle.PANEL_HEADING} /> -->
          <div class="text-fgs3 text-b2 font-medium">{section.section}</div>
        {/if}
        <div class="flex flex-wrap gap-3">
          {#if section.children}
            {#each section.children as item}
              <CpThumbnail
                orientation={Orientation.Vertical}
                action={item}
                width="w-40"
              />
            {/each}
          {/if}
        </div>
      </div>
    {/each}
    <ProductInfoFooter />
  </div>
</div>
