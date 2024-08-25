<script>
  import Button from "$lib/client/elements/button/Button.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { Layout } from "$lib/client/types/layout.type";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  let layout = refreshLayoutState();
  onMount(() => {
    const sub = uiState.subscribe((x) => {
      layout = refreshLayoutState();
    });
    return () => {
      sub();
    };
  });
  function refreshLayoutState() {
    const layoutState = uiState.getState(UIState.quickFocusLayout, {
      isDeviceScoped: true
    });
    return layoutState ?? Layout.LIST;
  }
</script>

<Button
  icon={layout === Layout.LIST ? "bars" : "squares-2x2"}
  size={Size.lg}
  on:click={() => {
    uiState.setState(
      UIState.quickFocusLayout,
      layout === Layout.LIST || !layout ? Layout.GRID : Layout.LIST,
      {
        isDeviceScoped: true
      }
    );
  }}
/>
