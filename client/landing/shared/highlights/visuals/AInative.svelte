<script lang="ts">
  import type { IListItem } from "../../landing.type";
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
