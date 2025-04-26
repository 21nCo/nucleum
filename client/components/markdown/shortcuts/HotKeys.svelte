<script lang="ts">
  import Table2 from "$lib/client/elements/table/Table2.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { TableCellType } from "$lib/client/types/table.type";
  import { shortcutsConfig } from "../../shortcuts/shortcuts.config";
  import HotKeyShortcutText from "./HotKeyShortcutText.svelte";
  const data = Object.entries(shortcutsConfig)
    .filter(
      ([_, value]) => value.key !== undefined && value.modifiers === undefined
    )
    .map(([key, value]) => ({
      id: key,
      shortcut: value,
      label: appStore.resolveAction(key)?.label
    }))
    .filter((x) => x.label !== undefined);
</script>

<Table2
  columns={[
    { label: "Page / Action", key: "label", width: 3 },
    {
      label: "Shortcut",
      key: "shortcut",
      type: TableCellType.CUSTOM,
      component: HotKeyShortcutText
    }
  ]}
  {data}
/>
