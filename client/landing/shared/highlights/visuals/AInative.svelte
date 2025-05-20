<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { IListItem } from "../../landing.type";
  import List from "../../list/List.svelte";

  const items: IListItem[] = [
    {
      title: "Local AI",
      icon: "ph:wifi-slash-light"
    },
    {
      title: "Bring your own keys",
      icon: "ph:person-simple-snowboard-light"
    },
    {
      title: "MCP server (soon)",
      icon: "ph:rocket-light"
    }
  ];
</script>

<List {items} orientation={Orientation.Horizontal} />
