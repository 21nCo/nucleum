<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import VerticalSwitcher from "@21n/ui/elements/switcher/VerticalSwitcher.svelte";

  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import { VerticalSwitcherStyle } from "@21n/ui/elements/switcher/switcher.enum";
  import type { ISelectValue } from "@21n/ui/elements/select/select.type";
  import { OverviewPanel } from "@nucleum/client/config/product.type";
  import { Product } from "@nucleum/client/config/product.type";
  import { resolveProductConfig } from "@nucleum/products/product.config";

  const items =
    resolveProductConfig(Product.NUCLEUM).overviewPanelSwitcherItems ?? [];

  let selectedPanel: OverviewPanel = resolveSavedState() ?? OverviewPanel.FOCUS;

  function isOverviewPanel(val: ISelectValue): val is OverviewPanel {
    return Object.values(OverviewPanel).includes(val as OverviewPanel);
  }

  function resolveSavedState() {
    const savedPanel = uiState.getState(UIState.nucleusOverviewPanel, {
      scope: UIStateScope.DEVICE
    });
    if (savedPanel && Object.values(OverviewPanel).includes(savedPanel)) {
      return savedPanel;
    }
  }

  function onSwitch(val: ISelectValue) {
    if (!val || !isOverviewPanel(val)) return;
    navigation.toggleSearchParamRecordSpecific("overview", { tab: val });
    uiState.setState(UIState.nucleusOverviewPanel, val, {
      scope: UIStateScope.DEVICE
    });
  }
</script>

<div class="h-full">
  <VerticalSwitcher
    {items}
    selected={selectedPanel}
    itemProps={{ size: Size.sm, activeStatusPlacement: Placement.Right }}
    style={VerticalSwitcherStyle.GRADIENT}
    {onSwitch}
  />
</div>
