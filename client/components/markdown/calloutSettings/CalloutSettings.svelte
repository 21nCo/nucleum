<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { markdownSettings } from "../markdown.settings";
  import CalloutSettingItem from "./CalloutSettingItem.svelte";
</script>

<div class="flex flex-col gap-4 w-full h-full">
  {#each $markdownSettings.callout as item}
    <CalloutSettingItem setting={item} />
  {/each}
  <div class="flex justify-center">
    <Button label="Add" />
  </div>
  <!-- Callout Preview -->
</div>
