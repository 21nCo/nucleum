<script lang="ts">
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import TwoColumnList from "@21n/landing/shared/features/visuals/TwoColumnList.svelte";
  const items: IListItem[] = [
    {
      title: "Link to curate",
      icon: "check",
      href: "https://docs.memotron.app/memotron/core#link-to-curate"
    },
    {
      title: "Simple collections",
      icon: "check",
      href: "https://docs.memotron.app/features/collections/simple"
    },
    {
      title: "Typed collections",
      icon: "check",
      href: "https://docs.memotron.app/features/collections/typed"
    },
    {
      title: "Universal properties",
      icon: "check",
      href: "https://docs.memotron.app/features/collections/typed#property-categories"
    },
    {
      title: "Relations",
      icon: "check",
      href: "https://docs.memotron.app/memotron/features/relations"
    }
  ];
</script>

<TwoColumnList {items} />
