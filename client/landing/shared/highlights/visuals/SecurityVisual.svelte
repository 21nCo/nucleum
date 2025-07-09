<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { IListItem } from "../../landing.type";
  import List from "../../list/List.svelte";

  const items: IListItem[] = [
    {
      title: "Open source",
      icon: "ph:code-light"
    },
    // {
    //   title: "End-to-end encryption",
    //   icon: "ph:lock-light"
    // },
    {
      title: "Offline-only version",
      icon: "ph:mountains-light"
    }
    // {
    //   title: "Plug your own database",
    //   icon: "ph:database-light"
    // }
  ];
</script>

<List {items} orientation={Orientation.Horizontal} />
