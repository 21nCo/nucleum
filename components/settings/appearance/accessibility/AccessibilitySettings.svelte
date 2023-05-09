<script lang="ts">
  import SizeFactorSetting from "./sizeFactor/SizeFactorSetting.svelte";
  export let parentBackgroundIndex: number = 1;
</script>

<SizeFactorSetting {parentBackgroundIndex} />
