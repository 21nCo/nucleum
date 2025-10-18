<script>
  import Button from "$lib/client/elements/button/Button.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
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
      scope: UIStateScope.DEVICE
    });
    return layoutState ?? Layout.LIST;
  }
</script>

<Button
  icon={layout === Layout.LIST ? "bars" : "grid"}
  size={Size.lg}
  on:click={() => {
    uiState.setState(
      UIState.quickFocusLayout,
      layout === Layout.LIST || !layout ? Layout.GRID : Layout.LIST,
      {
        scope: UIStateScope.DEVICE
      }
    );
  }}
/>
