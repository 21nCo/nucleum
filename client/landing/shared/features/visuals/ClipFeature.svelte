<script lang="ts">
  import type { IListItem } from "../../landing.type";
  import TwoColumnList from "./TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Text clipping",
      icon: "check"
    },
    {
      title: "Screenshot",
      icon: "check"
    },
    {
      title: "Youtube clipping",
      icon: "check"
    },
    {
      title: "Tweet clipping",
      icon: "check"
    },
    {
      title: "Kindle highlights sync",
      icon: "check"
    },
    {
      title: "Auto highlighter",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} color="aps1" />
