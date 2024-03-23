<script lang="ts">
  import { TextStyle } from "../types/text.enum";
  import BackButton from "./button/BackButton.svelte";
  import Text from "./text/Text.svelte";
  export let label: string;
  export let textStyle: TextStyle = TextStyle.PANEL_HEADING;
  export let backCallback: () => void;
</script>

<div class="flex justify-between items-center w-full h-16">
  <BackButton
    on:click={() => {
      backCallback();
    }}
  />
  <Text style={textStyle} content={label} />
  <div class="w-12 opacity-0"></div>
</div>
