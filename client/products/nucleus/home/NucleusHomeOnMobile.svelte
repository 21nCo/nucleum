<svelte:options runes={true} />

<script lang="ts">
  import PhoneHome from "@nucleum/surfaces/home/PhoneHome.svelte";
  import FocusTopNavWidget from "@nucleum/features/focus/player/FocusTopNavWidget.svelte";
</script>

<PhoneHome>
  {#snippet indicators()}
    <FocusTopNavWidget mode="indicator" />
  {/snippet}
</PhoneHome>
