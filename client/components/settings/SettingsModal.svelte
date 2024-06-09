<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import CpThumbnail from "../settings/CPThumbnail.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { ActionType, type IAction } from "$lib/client/types/action.type";
  import { onMount } from "svelte";
  import type { AppStore } from "$lib/client/types/appStore.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { isValidArray, sortArrayByOrder } from "$lib/client/utils/obj.utils";
  import ProfileCpSection from "./account/ProfileCPSection.svelte";
  import { AppEvent } from "$lib/client/types/event.enum";
  import SettingsFooter from "./SettingsFooter.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  let selected: string = "";
  let parentBgIndex: number = 2;
  // resolveAction("theme");
  let pageAction: IAction | null = null;
  let config: any;
  onMount(() => {
    appStore.subscribe((x: AppStore) => {
      if (x?.appData?.cp) {
        let cp = x.appData.cp;
        if (isValidArray(cp)) config = sortArrayByOrder(cp);
        console.log({ config });
      }
    });
  });
  function resolveAction(slug: string) {
    console.log(slug);
    if (!slug) return;
    const result = appStore.resolveComponent(slug);
    if (!result) return;
    if (result.type === ActionType.FUNCTION) {
      result.fn?.();
    } else if (result?.type === ActionType.LINK) {
      appStore.runNavigationAction(result);
    } else {
      pageAction = result;
    }
  }
</script>

<div class="flex w-full h-full">
  <div class="flex flex-col gap-8 w-80 bg-bgs2 rounded-l-md py-4 items-start">
    <div class="pl-4">
      <Text content="Settings" style={TextStyle.PAGE_HEADING} />
    </div>
    <ProfileCpSection
      context="modal"
      parentBackgroundIndex={2}
      on:click={() => {
        resolveAction(AppEvent.ACCOUNT);
      }}
    />
    {#if config}
      <div class="overflow-auto flex flex-col w-full gap-8">
        {#each config as section}
          <div class="flex flex-col w-full gap-2 items-start">
            {#if !section.isHideTitle}
              <div class="pl-4">
                <Text
                  content={section.section}
                  style={TextStyle.SECTION_HEADING}
                />
              </div>
              <!-- <div class="text-fgs3 text-b2 font-medium pl-4">
                {section.section}
              </div> -->
            {/if}
            <div class="flex flex-col w-full">
              {#if section.children}
                {#each section.children as item}
                  <CpThumbnail
                    parentBackgroundIndex={2}
                    orientation={Orientation.Horizontal}
                    action={item}
                    isActive={selected === item}
                    width="w-40"
                    on:click={() => {
                      selected = item;
                      resolveAction(item);
                    }}
                  />
                {/each}
              {/if}
            </div>
          </div>
        {/each}
        <SettingsFooter {parentBgIndex} />
      </div>
    {/if}
  </div>
  <div class="flex flex-col items-start flex-grow h-full p-4">
    {#if pageAction}
      <div class="flex justify-start h-10">
        <Text
          content={pageAction.label ?? ""}
          style={TextStyle.PANEL_HEADING}
        />
      </div>
      <div class="flex w-full max-w-xl justify-start items-start flex-grow">
        <ComponentResolver action={pageAction} />
      </div>
    {:else}
      <EmptyStatusView subText="Please select a setting to view it here" />
    {/if}
  </div>
</div>
