<script lang="ts">
  import type { IListItem } from "../../Landing.types";
  import List from "../../list/List.svelte";

  const items: IListItem[] = [
    {
      title: "MCP server (coming soon)"
    },
    {
      title: "Local AI"
    }
  ];
</script>

<List {items} />
