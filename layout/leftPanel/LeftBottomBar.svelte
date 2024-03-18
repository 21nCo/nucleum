<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { appStore, userPreferences } from "$lib/tidy/stores/app.store";
  import view from "$lib/tidy/stores/view.store";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  import { openLink, runAction } from "$lib/tidy/utils/utils";
  export let isInThinMode: boolean = false;
  export let isRounded: boolean = false;
  //let isCpActive: boolean = false;
  $: isCpActive =
    $page.params.route?.includes("/cp") || $page.route.id?.includes("/cp");
  // onMount(() => {
  //   windowObject.subscribe((x) => {
  //     console.log({ x });
  //     isCpActive = x?.currentPath?.includes("/cp");
  //   });
  // });
</script>

<div
  class="w-full {bgClass($userPreferences.theme, 2)} {isInThinMode
    ? 'h-24'
    : 'h-12'}"
>
  {#if $appStore.appData.leftPanelFooter === "simple" || !$appStore.appData.leftPanelFooter}
    <div
      class="w-full h-full flex {isInThinMode
        ? 'flex-col items-center'
        : 'flex-row'} justify-between items-center"
    >
      <button
        class="flex gap-2 h-full w-full items-center justify-center px-2 {!isInThinMode &&
        isRounded
          ? 'rounded-bl-lg'
          : ''} {isCpActive ? 'bg-a1' : ''}"
        on:click={() => runAction(AppEvent.SETTINGS)}
      >
        <Icon
          icon="settings"
          size={isInThinMode ? Size.md : Size.sm}
          isActive={isCpActive}
          selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        />
      </button>
      <button
        class="flex h-full w-full justify-center px-2 items-center gap-1 {isInThinMode
          ? 'rounded-b-lg'
          : 'rounded-br-lg'}"
        on:click={() => {
          // openLink($appStore?.appData?.urls?.help);
          runAction(AppEvent.HELP);
        }}
      >
        <Icon icon="help" size={isInThinMode ? Size.md : Size.sm} />
        {#if !isInThinMode}
          <span class="text-b3 text-fgs2">Help</span>
        {/if}
      </button>
    </div>
  {:else}
    <!-- else content here -->
  {/if}
</div>
