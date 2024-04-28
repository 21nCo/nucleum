<script lang="ts">
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import FloatingButton from "$lib/tidy/elements/button/FloatingButton.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import view from "$lib/tidy/stores/view.store";
  import type { ButtonParams } from "$lib/tidy/types/button.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  export let title: string | undefined = undefined;
  export let titleStyle: TextStyle = TextStyle.PAGE_HEADING_SUBTLE;
  export let floatingButton: ButtonParams | undefined = undefined;
</script>

<div class="flex w-full h-full">
  <div
    class="relative flex flex-col h-full {$view.isPortrait
      ? 'w-full'
      : 'w-[24rem] min-w-[24rem]'} "
  >
    {#if title}
      <div
        class="flex justify-between w-full {$view.isPortrait
          ? 'px-4 py-2'
          : 'px-4 pt-4 pb-2'}"
      >
        <Text style={titleStyle} content={title} />
        <slot name="toprightactions" />
      </div>
    {/if}
    {#if $$slots.nonpadded}
      <slot name="nonpadded" />
    {:else}
      <div class="px-4 flex-grow">
        <slot />
      </div>
    {/if}
    {#if floatingButton}
      <FloatingButton params={floatingButton} />
    {/if}
  </div>
  {#if !$view.isPortrait}
    <!-- Right split -->
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Normal}
    />
    <div class="relative flex grow h-full">
      <slot name="right" />
    </div>
  {/if}
</div>
