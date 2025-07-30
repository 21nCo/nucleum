<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import SettingThumbnail from "./SettingThumbnail.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import type { IAction } from "$lib/client/types/action.type";
  import { onMount } from "svelte";
  import {
    AppSearchParam,
    type IAppStore
  } from "$lib/client/types/appStore.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { isValidArray, sortArrayByOrder } from "$lib/shared/utils/obj.utils";
  import ProfileCpSection from "./account/ProfileCPSection.svelte";
  import SettingsFooter from "./SettingsFooter.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { page } from "$app/stores";
  let selected: string = "";
  let parentBgIndex: number = 2;
  // resolveAction("theme");
  let pageAction: IAction | null = null;
  let config: any;
  onMount(() => {
    const sub = appStore.subscribe((x: IAppStore) => {
      if (x?.appData?.cp) {
        let cp = x.appData.cp;
        if (isValidArray(cp)) config = sortArrayByOrder(cp);
      }
    });
    const pageSub = page.subscribe((x) => {
      const settingSearchParam = x?.url?.searchParams?.get("setting");
      if (settingSearchParam) {
        selected = settingSearchParam;
        runAction(selected);
      }
    });
    return () => {
      sub();
      pageSub();
    };
  });
  async function runAction(slug: string) {
    if (!slug) return;
    const result = await appStore.runAction(slug, {
      isReturnIfComponent: true
    });
    if (!result) return;
    pageAction = result;
  }
</script>

<div class="flex w-full h-full">
  <div
    class="flex flex-col overflow-auto gap-8 w-[21rem] min-w-[21rem] shrink-0 bg-bgs2 rounded-l-md py-4 items-start"
  >
    <div class="pl-4">
      <Text content="Settings" style={TextStyle.PAGE_HEADING} />
    </div>
    <div class="flex flex-col overflow-auto gap-8 w-full">
      <ProfileCpSection
        context="modal"
        parentBackgroundIndex={2}
        on:click={() => {
          appStore.toggleSearchParam({
            [AppSearchParam.SETTING]: Action.ACCOUNT
          });
        }}
      />
      {#if config}
        <div class=" flex flex-col w-full gap-8">
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
                    <SettingThumbnail
                      parentBackgroundIndex={2}
                      orientation={Orientation.Horizontal}
                      action={item}
                      isActive={selected === item}
                      width="w-40"
                      on:click={() => {
                        appStore.toggleSearchParam({
                          [AppSearchParam.SETTING]: item
                        });
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
  </div>
  <div class="flex flex-col items-start flex-grow h-full p-4">
    {#if pageAction}
      <div class="flex justify-start h-10">
        <Text
          content={pageAction.label ?? ""}
          style={TextStyle.PANEL_HEADING}
          isPreventProperCasing={true}
        />
      </div>
      <div class="flex w-full justify-start items-start flex-grow">
        <ComponentResolver action={pageAction} />
      </div>
    {:else}
      <EmptyStatusView subText="Please select a setting to view it here" />
    {/if}
  </div>
</div>
