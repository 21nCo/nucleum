<script lang="ts">
  import type { IFwFeature } from "@21n/types/featureWheel.type";
  export let features: IFwFeature[] = [];
  export let selected: string[] = [];
  export let categories: string[] = [];
  export let onSelect: (selected: string[]) => void = () => {};
  $: [features, selected, categories, onSelect];
</script>
