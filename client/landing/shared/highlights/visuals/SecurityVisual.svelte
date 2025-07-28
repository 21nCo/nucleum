<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { IListItem } from "../../landing.type";
  import List from "../../list/List.svelte";

  const items: IListItem[] = [
    {
      title: "Open source",
      icon: "code"
    },
    {
      title: "End-to-end encryption (soon)",
      icon: "lock"
    },
    {
      title: "Offline-only version",
      icon: "ph:mountains-light"
    }
    // {
    //   title: "Plug your own database",
    //   icon: "database"
    // }
  ];
</script>

<List {items} orientation={Orientation.Horizontal} />
