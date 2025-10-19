<script lang="ts">
  import Text from "@21n/elements/text/Text.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import SettingThumbnail from "@21n/components/settings/SettingThumbnail.svelte";
  import ComponentResolver from "@21n/layout/paint/ComponentResolver.svelte";
  import type { IAction } from "@21n/types/action.type";
  import { onMount } from "svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { appStore } from "@21n/stores/app.store";
  import ProfileCpSection from "@21n/components/settings/account/ProfileCPSection.svelte";
  import SettingsFooter from "@21n/components/settings/SettingsFooter.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Action } from "@21n/types/action.enum";
  import { page } from "$app/stores";
  import { resolveProductConfig } from "@21n/products/product.config";
  import BackButton from "@21n/elements/button/BackButton.svelte";
  let selected: string = "";
  let parentBgIndex: number = 2;
  // resolveAction("theme");
  let pageAction: IAction | null = null;
  const backPath = $page.url.searchParams.get(AppSearchParam.RETURN_TO);
  const config = resolveProductConfig().settings;
  onMount(() => {
    const pageSub = page.subscribe((x) => {
      const settingSearchParam = x?.url?.searchParams?.get("setting");
      if (settingSearchParam) {
        selected = settingSearchParam;
        runAction(selected);
      }
    });
    return () => {
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
    class="flex flex-col overflow-auto gap-8 w-72 min-w-72 dp:w-[21rem] dp:min-w-[21rem] shrink-0 bg-bgs2 rounded-l-md py-4 items-start otop:pt-12"
  >
    <div class="pl-4">
      <BackButton
        isEnabled={backPath !== null}
        {parentBgIndex}
        isPreventDefault={true}
        on:click={() => {
          if (backPath) appStore.gotoPath(backPath);
        }}
      >
        <Text
          content="Settings"
          style={backPath ? TextStyle.PANEL_HEADING : TextStyle.PAGE_HEADING}
        />
      </BackButton>
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
  <div class="flex flex-col items-start flex-grow h-full p-4 otop:pt-12">
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
