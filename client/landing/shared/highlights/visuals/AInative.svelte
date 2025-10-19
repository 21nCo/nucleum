<script lang="ts">
  import { Orientation } from "@21n/types/direction.enum";
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import List from "@21n/landing/shared/list/List.svelte";

  const items: IListItem[] = [
    {
      title: "On-device AI",
      icon: "ph:wifi-slash-light"
    },
    // {
    //   title: "Bring your own keys",
    //   icon: "ph:person-simple-snowboard-light"
    // },
    {
      title: "MCP server (soon)",
      icon: "ph:rocket-launch-light"
    }
  ];
</script>

<List {items} orientation={Orientation.Horizontal} />
