<script lang="ts">
  import type { IListItem } from "../../landing.type";
  import TwoColumnList from "./TwoColumnList.svelte";

  const items: IListItem[] = [
    {
      title: "Infinitely nestable goals",
      icon: "check"
    },
    {
      title: "Tasks",
      icon: "check"
    },
    {
      title: "Goal Analytics",
      icon: "check"
    },
    {
      title: "Sub goal views",
      icon: "check"
    },
    {
      title: "Progress tracking (soon)",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} slice={3} color="aps1" />
