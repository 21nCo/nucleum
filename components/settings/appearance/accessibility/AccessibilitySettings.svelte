<script lang="ts">
  import ControlPanelLayout from "../../ControlPanelLayout.svelte";
  import SizeFactorSetting from "./sizeFactor/SizeFactorSetting.svelte";
  export let parentBackgroundIndex: number = 1;
</script>

<SizeFactorSetting {parentBackgroundIndex} />
