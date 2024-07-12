<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { dboVersion } from "$lib/client/stores/app.store";
  let value: number = $dboVersion.version ?? 0;
  let isDboUpdateInProgress: boolean = false;
</script>

<TextInput
  type="number"
  bind:value
  label={{ label: "Set last run changeId" }}
/>
<Button
  isExpandToFullWidth={true}
  isLoading={isDboUpdateInProgress}
  on:click={async () => {
    isDboUpdateInProgress = true;
    await dboVersion.runDboUpdate(value);
    isDboUpdateInProgress = false;
  }}
  icon="play"
  label="Run"
/>
