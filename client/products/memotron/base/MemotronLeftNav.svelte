<script>
  import ProfileLeftPanelSection from "$lib/client/components/settings/account/ProfileLeftPanelSection.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import LeftNav from "$lib/client/layout/leftPanel/LeftNav.svelte";

  import { TextStyle } from "$lib/client/types/text.enum";
</script>

<LeftNav>
  <slot name="top" slot="top">
    <div class="text-b4 text-fgs3">
      {"[Preview release]"}
    </div>
  </slot>
  <slot name="header" slot="header">
    <div class="flex flex-col w-full justify-center items-center gap-4">
      <ProfileLeftPanelSection />
    </div>
  </slot>
  <!-- <slot name="mid" slot="mid">
      <div class="flex flex-col gap-2 w-full items-start">
        <Text content="Starred" style={TextStyle.SECTION_HEADING} />
        <span class="text-b3 text-fgs3 self-center">No starred items found</span>
      </div>
    </slot> -->
</LeftNav>
