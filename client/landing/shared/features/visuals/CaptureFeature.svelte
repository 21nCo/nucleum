<script lang="ts">
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import TwoColumnList from "@21n/landing/shared/features/visuals/TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Quick markdown capture",
      icon: "check"
    },
    {
      title: "Capture using camera",
      icon: "check"
    },
    {
      title: "Audio recording & transcription",
      icon: "check"
    },
    {
      title: "PDF upload and annotation",
      icon: "check"
    },
    {
      title: "File capture",
      icon: "check"
    },
    {
      title: "Capture properties",
      icon: "check"
    },
    {
      title: "Capture from clipboard",
      icon: "check"
    }
  ];
</script>

<TwoColumnList {items} />
