<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";

  let isDboUpdateInProgress: boolean = false;
</script>

<Button
  isExpandToFullWidth={true}
  isLoading={isDboUpdateInProgress}
  on:click={async () => {
    isDboUpdateInProgress = true;
    await dataManager.runDboUpdate();
    isDboUpdateInProgress = false;
  }}
  icon="play"
  label="Run"
/>
