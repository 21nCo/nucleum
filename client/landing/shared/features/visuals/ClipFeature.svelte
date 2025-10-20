<script lang="ts">
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import TwoColumnList from "@21n/landing/shared/features/visuals/TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Text highlighting",
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
      title: "Social media clipping",
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
