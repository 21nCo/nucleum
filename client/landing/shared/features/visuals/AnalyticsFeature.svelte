<script lang="ts">
  import type { IListItem } from "../../landing.type";
  import TwoColumnList from "./TwoColumnList.svelte";

  const items: IListItem[] = [
    {
      title: "Calendar",
      icon: "check"
    },
    {
      title: "Analytics",
      icon: "check"
    },
    {
      title: "Infinitely customizable charts",
      icon: "check"
    },
    {
      title: "Command bar",
      icon: "check"
    },
    {
      title: "Keyboard shortcuts",
      icon: "check"
    },
    {
      title: "Themes & personalisation",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} slice={3} />
