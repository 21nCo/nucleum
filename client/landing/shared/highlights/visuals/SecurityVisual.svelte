<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { IListItem } from "../../landing.type";
  import List from "../../list/List.svelte";

  const items: IListItem[] = [
    {
      title: "End-to-end encryption",
      icon: "ph:lock-light"
    },
    {
      title: "Plug your own database",
      icon: "ph:database-light"
    },
    {
      title: "Offline version",
      icon: "ph:mountains-light"
    }
  ];
</script>

<List {items} orientation={Orientation.Horizontal} />
