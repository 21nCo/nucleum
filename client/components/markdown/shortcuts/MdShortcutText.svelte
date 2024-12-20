<script lang="ts">
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import context from "$lib/client/stores/context.store";
  import { ModifierKey } from "$lib/client/types/keyboard.type";
  import { resolveShortcutText } from "../../shortcuts/shortcut.utils";
  import { BlockAction, InlineType } from "../md.type";

  export let row: any | undefined = undefined;
  export let type: NodeType | InlineType | BlockAction | undefined = undefined;

  $: _id = type ?? row.id;

  const mdShortcutMap = [
    {
      id: BlockAction.INSERT,
      key: "/"
    },
    {
      id: BlockAction.MENTION,
      key: "@ or [ ]"
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
      key: "#"
    },
    {
      id: NodeType.HEADING2,
      key: "##"
    },
    {
      id: NodeType.HEADING3,
      key: "###"
    },
    {
      id: NodeType.HEADING4,
      key: "####"
    },
    {
      id: NodeType.QUOTE,
      key: '" or >'
    },
    {
      id: NodeType.CALLOUT,
      key: "!"
    },
    {
      id: NodeType.CODE,
      key: "```"
    },
    {
      id: NodeType.LIST,
      key: "* or -"
    },
    {
      id: NodeType.ORDERED_LIST,
      key: "1."
    },
    {
      id: NodeType.CHECKLIST,
      key: "+ or [ ]"
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
    const shortcut = mdShortcutMap.find((x) => x.id === _id);
    if (!shortcut) return _id;
    if (!shortcut.modifiers) {
      return shortcut.key;
    }
    return resolveShortcutText(
      shortcut.key,
      shortcut.modifiers ?? [],
      $context.os
    );
  }
</script>

<span class="rounded-md px-2 py-1 flex">
  {resolveShortcut()}
</span>
