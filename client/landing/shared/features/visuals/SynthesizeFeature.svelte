<script lang="ts">
  import type { IListItem } from "../../landing.type";
  import TwoColumnList from "./TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Performant search",
      icon: "check"
    },
    {
      title: "Slick opening shortcuts",
      icon: "check"
    },
    {
      title: "Graph & Bird views",
      icon: "check"
    },
    {
      title: "Calendar",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} color="aps1" />
