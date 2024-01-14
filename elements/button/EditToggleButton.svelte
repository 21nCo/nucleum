<script lang="ts">
  import { isInEditMode } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import Button from "./Button.svelte";
</script>

<Button
  label={"edit: " + ($isInEditMode ? "on" : "off")}
  size={Size.xs}
  on:click={() => isInEditMode.toggle()}
/>
