<script lang="ts">
  import type { IListItem } from "../../landing.type";
  import TwoColumnList from "./TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Collections",
      icon: "check"
    },
    {
      title: "Typed collections",
      icon: "check"
    },
    {
      title: "Link to curate",
      icon: "check"
    },
    {
      title: "Relations",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} />
