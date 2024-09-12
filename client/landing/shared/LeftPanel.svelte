<script>
  import { goto } from "$app/navigation";
  import Icon from "$lib/client/elements/Icon.svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelName } from "./Landing.types";
  import PanelButton from "./elements/PanelButton.svelte";
</script>

<PanelButton
  label={PanelName.BUILT_AT_BLANK_COOP}
  icon="long-arrow-left"
  on:click={() => goto("https://blanklabs.org/")}
/>
