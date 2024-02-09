<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import TextInput from "$lib/tidy/elements/input/TextInput.svelte";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { runDboUpdate } from "$lib/tidy/utils/account.utils";
  let value: number = $userPreferences.lastRunChangeId ?? 0;
  let isDboUpdateInProgress: boolean = false;
</script>

<TextInput type="number" bind:value label="Set last run changeId" />
<Button
  width="w-full"
  isLoading={isDboUpdateInProgress}
  on:click={async () => {
    isDboUpdateInProgress = true;
    await runDboUpdate(value);
    isDboUpdateInProgress = false;
  }}
  icon="play"
  label="Run"
/>
