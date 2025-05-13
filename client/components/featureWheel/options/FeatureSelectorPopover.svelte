<script lang="ts">
  import type { IFwFeature } from "$lib/client/types/featureWheel.type";
  export let features: IFwFeature[] = [];
  export let selected: string[] = [];
  export let categories: string[] = [];
  export let onSelect: (selected: string[]) => void = () => {};
</script>
