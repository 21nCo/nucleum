<script lang="ts">
  import HeaderV1 from "./HeaderV1.svelte";
  import Footer from "./Footer.svelte";
  import VerticalDaysLayout from "./VerticalDaysLayout.svelte";
  // export let view: "V1" | "V2";
</script>

<div>
  <HeaderV1 />
  <VerticalDaysLayout view="V1" />
  <Footer />
</div>

<style>
  div {
    width: 393px;
    height: 852px;
    border-radius: 4px;
    border: 1px solid var(--colors-border-s4, #dbdbdb);
  }
</style>
