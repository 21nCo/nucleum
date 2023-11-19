<script lang="ts">
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import FloatingButton from "$lib/tidy/elements/button/FloatingButton.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";
  import type { ButtonType } from "$lib/tidy/types/button.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { ColorStrength } from "$lib/tidy/types/theme.type";
  export let title: string | undefined = undefined;
  export let titleStyle: TextStyle = TextStyle.PAGE_HEADING;
  export let floatingButton: ButtonType | undefined = undefined;
</script>

<div
  class="relative flex flex-col h-full {$windowObject.isInPortraitMode
    ? 'w-full'
    : 'w-[26rem] min-w-[26rem]'} "
>
  {#if title}
    <div class="p-4">
      <Text style={titleStyle} content={title} />
    </div>
  {/if}
  {#if $$slots.nonpadded}
    <slot name="nonpadded" />
  {:else}
    <div class="p-4 flex-grow">
      <slot />
    </div>
  {/if}
  {#if floatingButton}
    <FloatingButton {...floatingButton} />
  {/if}
</div>
{#if !$windowObject.isInPortraitMode}
  <!-- Right split -->
  <Divider
    orientation={Orientation.Vertical}
    colorStrength={ColorStrength.Strong}
  />
  <div class="relative flex grow h-full">
    <slot name="right" />
  </div>
{/if}
