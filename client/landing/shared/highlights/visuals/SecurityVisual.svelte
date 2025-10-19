<script lang="ts">
  import { Orientation } from "@21n/types/direction.enum";
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import List from "@21n/landing/shared/list/List.svelte";

  const items: IListItem[] = [
    {
      title: "Open source",
      icon: "ph:code-light"
    },
    {
      title: "End-to-end encryption (soon)",
      icon: "ph:lock-light"
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
