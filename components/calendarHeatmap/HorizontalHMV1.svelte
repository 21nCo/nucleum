<script lang="ts">
  import DaysLayout from "./DaysLayout.svelte";
  import HeaderV1 from "./HeaderV1.svelte";
  import MicroIndicatorTile from "./MicroIndicatorTile.svelte";
  import Footer from "./Footer.svelte";
</script>

<div>
  <HeaderV1 />
  <DaysLayout view="V1" />
  <Footer />
</div>

<style>
  div {
    width: 1500px;
    height: 279px;
    border-radius: 4px;
    border: 1px solid var(--colors-border-s4, #dbdbdb);
  }
</style>
