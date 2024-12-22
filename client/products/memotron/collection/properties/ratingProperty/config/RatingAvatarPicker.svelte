<script lang="ts">
  import { tooltip } from "$lib/client/actions/popover.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { phosphorRatingIcons } from "$lib/client/iconsV2/icons-list";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  export let onAvatarSelect: (icon: string) => void;
</script>

<div
  class="flex flex-col gap-3 w-80 h-96 bg-bgs2 border border-brs3 rounded-md p-3"
>
  <Text content="Select an icon" style={TextStyle.SECTION_HEADING_SMALL} />
  <div class="flex flex-wrap overflow-y-auto h-full">
    {#each phosphorRatingIcons as icon}
      <button
        class="w-10 h-10 bg-bgs2 rounded-md flex items-center justify-center hover:bg-bgs3 cursor-pointer"
        use:tooltip={{ text: icon }}
        on:click={() => onAvatarSelect(icon)}
      >
        <Icon icon={"ph:" + icon} size={Size.lg} />
      </button>
    {/each}
  </div>
</div>
