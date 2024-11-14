<script lang="ts">
  import Table2 from "$lib/client/elements/table/Table2.svelte";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { TableCellType } from "$lib/client/types/table.type";
  import { BlockAction } from "../md.type";
  import MdShortcutText from "./MdShortcutText.svelte";
  const data = [
    {
      id: BlockAction.INSERT,
      description: "Insert a new block"
    },
    {
      id: BlockAction.MENTION,
      description: "Mention a node or a collection (Beta)"
    },
    {
      id: BlockAction.DUPLICATE,
      description: "Duplicate current block"
    },
    {
      id: BlockAction.MOVEUP,
      description: "Move the block up"
    },
    {
      id: BlockAction.MOVEDOWN,
      description: "Move the block down"
    },
    {
      id: NodeType.HEADING1,
      description: "Headings"
    },
    {
      id: NodeType.QUOTE,
      description: "Quote"
    },
    {
      id: NodeType.LIST,
      description: "Unordered list"
    },
    {
      id: NodeType.ORDERED_LIST,
      description: "Ordered list"
    },
    {
      id: NodeType.CHECKLIST,
      description: "Check list"
    },
    {
      id: NodeType.DIVIDER,
      description: "Divider"
    },
    {
      id: NodeType.DOUBLE_DIVIDER,
      description: "Double divider"
    }
  ];
</script>

<Table2
  columns={[
    { label: "Description", key: "description", width: 3 },
    {
      label: "Shortcut",
      key: "shortcut",
      type: TableCellType.CUSTOM,
      component: MdShortcutText
    }
  ]}
  {data}
/>
