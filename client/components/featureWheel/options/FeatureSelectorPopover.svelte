<script lang="ts">
  import type { IFwFeature } from "@21n/types/featureWheel.type";
  let {
    features = [],
    selected = $bindable([]),
    categories = [],
    onSelect = () => {}
  }: {
    features?: IFwFeature[];
    selected?: string[];
    categories?: string[];
    onSelect?: (selected: string[]) => void;
  } = $props();
  $effect(() => {
    features;
    selected;
    categories;
    onSelect;
  });
</script>
