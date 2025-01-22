<script lang="ts">
  import { tooltip } from "$lib/client/actions/popover.action";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { phosphorRatingIcons } from "$lib/client/iconsV2/icons-list";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let onAvatarSelect: (icon: string) => void;
  export let onSizeSelect: (size: number) => void;
  export let scale: number = 5;
  export let avatar: string;
  let _scale: number | "custom" =
    scale === 3 || scale === 5 || scale === 10 ? scale : "custom";
  let _customScaleValue: number = scale;
</script>

<div
  class="flex flex-col gap-3 w-80 h-96 bg-bgs1 border border-brs3 rounded-md p-3"
>
  <OptionSelector
    size={Size.sm}
    labelProps={{ label: "Scale" }}
    options={[{ value: 3 }, { value: 5 }, { value: 10 }, { value: "custom" }]}
    parentBackgroundIndex={2}
    bind:selected={_scale}
    on:select={() => {
      if (_scale !== "custom") {
        _customScaleValue = _scale;
        onSizeSelect(_scale);
      }
    }}
  />
  {#if _scale === "custom"}
    <TextInput
      type="number"
      bind:value={_customScaleValue}
      on:change={(e) => {
        onSizeSelect(_customScaleValue);
      }}
      placeholder="Enter custom scale"
    />
  {/if}
  <Divider orientation={Orientation.Horizontal} />
  <Text content="Select an icon" style={TextStyle.SECTION_HEADING_SMALL} />
  <div class="flex flex-wrap overflow-y-auto h-full">
    {#each phosphorRatingIcons as icon}
      <button
        class={cn(
          "w-10 h-10 rounded-md flex items-center justify-center hover:bg-bgs2 cursor-pointer",
          {
            "bg-aps3": icon === avatar
          }
        )}
        use:tooltip={{ text: icon }}
        on:click={() => {
          avatar = icon;
          onAvatarSelect(icon);
        }}
      >
        <Icon
          icon={"ph:" + icon}
          size={Size.lg}
          class={cn({
            "text-aps1": icon === avatar
          })}
        />
      </button>
    {/each}
  </div>
</div>
