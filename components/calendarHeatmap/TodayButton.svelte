<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { calendarHmSelectedTile } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
</script>

{#if $calendarHmSelectedTile !== new Date().toISOString().split("T")[0]}
  <Button
    label="Go to today"
    size={Size.xs}
    on:click={() => {
      calendarHmSelectedTile.set(new Date().toISOString().split("T")[0]);
    }}
  />
{/if}
