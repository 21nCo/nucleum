<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import CpThumbnail from "../settings/CPThumbnail.svelte";
  import AppNameWithVersion from "../settings/about/AppNameWithVersion.svelte";
  import ProductInfoFooter from "../settings/about/ProductInfoFooter.svelte";
  import BackButton from "$lib/client/elements/button/BackButton.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";

  import { ActionType, type Action } from "$lib/client/types/action.type";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { AppEvent } from "$lib/client/types/event.enum";
  import NavigationHeader from "$lib/client/elements/NavigationHeader.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  let pageAction: Action | null = null;
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
  function resolveAction(slug: string) {
    console.log(slug);
    if (!slug) return;
    const result = appStore.resolveComponent(slug);
    if (!result) return;
    if (result.type === ActionType.FUNCTION) {
      result.fn?.();
      if (slug === "chat") modalEvent.hideSpecific(AppEvent.HELP);
    } else if (result?.type === ActionType.LINK) {
      appStore.runNavigationAction(result);
    } else {
      pageAction = result;
    }
  }
</script>

<div class="flex flex-col gap-6 w-full h-full p-8 pb-12">
  {#if pageAction}
    <div class="flex flex-col gap-1 h-full">
      <NavigationHeader
        label={pageAction.label ?? ""}
        backCallback={() => {
          pageAction = null;
        }}
      />
      <ComponentResolver action={pageAction} />
    </div>
  {:else}
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
                  on:click={() => {
                    resolveAction(item);
                  }}
                />
              {/each}
            {/if}
          </div>
        </div>
      {/each}
      <ProductInfoFooter />
    </div>
  {/if}
</div>
