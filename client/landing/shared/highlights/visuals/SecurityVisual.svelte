<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { IListItem } from "../../landing.type";
  import List from "../../list/List.svelte";

  const items: IListItem[] = [
    {
      title: "End-to-end encryption",
      icon: "lock"
    },
    {
      title: "Plug your own database",
      icon: "database"
    },
    {
      title: "Offline version",
      icon: "offline"
    }
  ];
</script>

<List {items} orientation={Orientation.Horizontal} />
