<script>
  import Button from "$lib/client/elements/button/Button.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { Layout } from "$lib/client/types/layout.type";
  import { UIState } from "$lib/client/types/preferences.type";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  let layout = refreshLayoutState();
  onMount(() => {
    const sub = userPreferences.subscribe((x) => {
      layout = refreshLayoutState();
    });
    return () => {
      sub();
    };
  });
  function refreshLayoutState() {
    return userPreferences.resolveUiState(UIState.quickFocusLayout);
  }
</script>

<Button
  icon={layout === Layout.LIST ? "bars" : "squares-2x2"}
  size={Size.lg}
  on:click={() => {
    userPreferences.setUiState({
      property: UIState.quickFocusLayout,
      value: layout === Layout.LIST ? Layout.GRID : Layout.LIST
    });
  }}
/>
