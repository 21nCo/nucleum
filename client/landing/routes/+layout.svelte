<script lang="ts">
  import { page } from "$app/stores";
  import "$lib/client/app.css";
  import BlankLandingLayout from "../shared/BlankLandingLayout.svelte";
  import { landing } from "../shared/store/shared.store";
  export let data;
  if (data.urls) landing.load(data.urls);
  $: isComparePage = $page.url.pathname.includes("compare");
</script>

<BlankLandingLayout
  topNavBarValues={data.topNavBarValues}
  footerValues={data.footerValues}
  isProduct={data.isProduct}
  {isComparePage}
>
  <slot />
</BlankLandingLayout>
