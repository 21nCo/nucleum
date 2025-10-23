<script lang="ts">
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import TwoColumnList from "@21n/landing/shared/features/visuals/TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Highly performant search",
      icon: "check"
    },
    {
      title: "Full offline support",
      icon: "check"
    },
    {
      title: "Slick opening shortcuts",
      icon: "check"
    },
    {
      title: "Graph view",
      icon: "check"
    },
    {
      title: "Map view",
      icon: "check"
    },
    {
      title: "Bird view",
      icon: "check",
      href: "https://docs.memotron.app/memotron/features/bird-view"
    },
    {
      title: "Calendar",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} color="aps1" />
