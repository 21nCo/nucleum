<script lang="ts">
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import TwoColumnList from "@21n/landing/shared/features/visuals/TwoColumnList.svelte";

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
