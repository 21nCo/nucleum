<script>
  import ProfileLeftPanelSection from "$lib/client/components/settings/account/ProfileLeftPanelSection.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import LeftNav from "$lib/client/layout/leftPanel/LeftNav.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { Size } from "$lib/client/types/size.enum";

  import { TextStyle } from "$lib/client/types/text.enum";
</script>

<LeftNav>
  <slot name="top" slot="top">
    <div class="text-b3 text-fgs3">
      {"[Memotron Preview]"}
    </div>
  </slot>
  <slot name="header" slot="header">
    <div class="flex flex-col w-full justify-center items-center gap-4">
      <ProfileLeftPanelSection />
      <div class="px-3 w-full mt-4">
        <button
          class="h-10 w-full flex justify-between items-center px-2 border border-brs3 rounded-md hover:bg-bgs3 text-b2 text-fgs2 font-light"
          on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
        >
          <span class="flex gap-2 items-center">
            <Icon icon="ph:magnifying-glass" size={Size.sm} />
            <span> Search </span>
          </span>
          <ShortcutText shortcut={Action.GLOBAL_SEARCH} parentBgIndex={2} />
        </button>
      </div>
    </div>
  </slot>
  <slot name="header-thin" slot="header-thin">
    <div class="w-full flex justify-center">
      <Button
        icon="ph:magnifying-glass"
        parentBgIndex={2}
        on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
      />
    </div>
  </slot>
  <!-- <slot name="mid" slot="mid">
      <div class="flex flex-col gap-2 w-full items-start">
        <Text content="Starred" style={TextStyle.SECTION_HEADING} />
        <span class="text-b3 text-fgs3 self-center">No starred items found</span>
      </div>
    </slot> -->
</LeftNav>
