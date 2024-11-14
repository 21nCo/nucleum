<script lang="ts">
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import context from "$lib/client/stores/context.store";
  import { ModifierKey } from "$lib/client/types/keyboard.type";
  import { resolveShortcutText } from "../../shortcuts/shortcut.utils";
  import { BlockAction } from "../md.type";

  export let row: any;

  const mdShortcutMap = [
    {
      id: BlockAction.INSERT,
      key: "/"
    },
    {
      id: BlockAction.MENTION,
      key: "@ or ["
    },
    {
      id: BlockAction.DUPLICATE,
      key: "d",
      modifiers: [ModifierKey.META]
    },
    {
      id: BlockAction.MOVEUP,
      key: "up",
      modifiers: [ModifierKey.ALT]
    },
    {
      id: BlockAction.MOVEDOWN,
      key: "down",
      modifiers: [ModifierKey.ALT]
    },
    {
      id: NodeType.HEADING1,
      key: "# x n"
    },
    {
      id: NodeType.QUOTE,
      key: '"'
    },
    {
      id: NodeType.LIST,
      key: "*"
    },
    {
      id: NodeType.ORDERED_LIST,
      key: "1."
    },
    {
      id: NodeType.CHECKLIST,
      key: "+"
    },
    {
      id: NodeType.DIVIDER,
      key: "---"
    },
    {
      id: NodeType.DOUBLE_DIVIDER,
      key: "==="
    }
  ];

  function resolveShortcut() {
    const shortcut = mdShortcutMap.find((x) => x.id === row.id);
    if (!shortcut) return row.id;
    return resolveShortcutText(
      shortcut.key,
      shortcut.modifiers ?? [],
      $context.os
    );
  }
</script>

<span class="text-b2 text-fgs3 rounded-md px-2 py-1 flex">
  {resolveShortcut()}
</span>
