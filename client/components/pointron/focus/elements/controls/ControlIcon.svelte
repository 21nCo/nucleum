<script lang="ts">
  import { sessionStore } from "$lib/client/components/pointron/focus/session.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  export let icon: string;
  export let contextSize: Size = Size.md;
  let iconSize: Size = Size.lg;
  $: iconSize =
    contextSize === Size.sm || contextSize === Size.md ? Size.lg : contextSize;
</script>

<Icon
  {icon}
  size={iconSize}
  selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
  isActive={true}
  isOutlineForActive={contextSize != Size.sm}
  bgColorHue={contextSize != Size.sm ? -1 : $sessionStore.currentLog.color}
/>
