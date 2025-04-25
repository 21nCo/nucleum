<script lang="ts">
  import type { IFeature } from "../Landing.types";
  export let feature: IFeature;
  export let isReversed: boolean = false;
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-2">
    <h3 class="text-h4 font-semibold text-left">{feature.title}</h3>
    <p class="text-lb2 text-fgs2 text-left">{feature.desc}</p>
  </div>
</div>
