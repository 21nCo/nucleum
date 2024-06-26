<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import SettingThumbnail from "../settings/SettingThumbnail.svelte";
  import AppNameWithVersion from "../settings/about/AppNameWithVersion.svelte";
  import ProductInfoFooter from "../settings/about/ProductInfoFooter.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import type { IAction } from "$lib/client/types/action.type";
  import NavigationHeader from "$lib/client/elements/NavigationHeader.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { isValidString } from "$lib/client/utils/text.utils";
  import { formatDate } from "$lib/client/utils/time.utils";
  let pageAction: IAction | null = null;
  $: config = $appStore?.appData?.help;
  async function runAction(slug: string) {
    if (!slug) return;
    const result = await appStore.runAction(slug, {
      isReturnIfComponent: true
    });
    if (!result) return;
    pageAction = result;
  }
</script>

{#if config && config?.length > 0}
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
          <div>
            {isValidString($appStore?.appData?.updated)
              ? "Updated: " + formatDate(new Date($appStore?.appData?.updated))
              : ""}
          </div>
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
                  <SettingThumbnail
                    orientation={Orientation.Vertical}
                    action={item}
                    width="w-40"
                    on:click={() => {
                      runAction(item);
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
{/if}
