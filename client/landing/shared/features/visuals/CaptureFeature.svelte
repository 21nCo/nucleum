<script lang="ts">
  import type { IListItem } from "../../landing.type";
  import TwoColumnList from "./TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Quick markdown capture",
      icon: "check"
    },
    {
      title: "Camera capture",
      icon: "check"
    },
    {
      title: "Capture using audio",
      icon: "check"
    },
    {
      title: "File capture",
      icon: "check"
    },
    {
      title: "Capture properties",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} />
