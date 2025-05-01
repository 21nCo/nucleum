<script lang="ts">
  import type { IListItem } from "../../landing.type";
  import TwoColumnList from "./TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Quick focus",
      icon: "check"
    },
    {
      title: "Pomodoro",
      icon: "check"
    },
    {
      title: "Countup timer",
      icon: "check"
    },
    {
      title: "Countdown timer",
      icon: "check"
    },
    {
      title: "Set by end time",
      icon: "check"
    },
    {
      title: "Manual logging",
      icon: "check"
    },
    {
      title: "Target duration focus",
      icon: "check"
    },
    {
      title: "Start from presets",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} />
