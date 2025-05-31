<script lang="ts">
  import Table2 from "$lib/client/elements/table/Table2.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { TableCellType } from "$lib/client/types/table.type";
  import HotKeyShortcutText from "./HotKeyShortcutText.svelte";
  import { keyboardShortcuts } from "../../shortcuts/shortcuts.store";
  const data = keyboardShortcuts
    .fetchKeyMap()
    .filter((x) => x.key !== undefined && x.modifiers === undefined)
    .map((x) => ({
      id: x.action,
      shortcut: x,
      label: appStore.resolveAction(x.action)?.label
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
