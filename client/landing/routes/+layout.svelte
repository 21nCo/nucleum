<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import "@21n/client/app.css";
  import BlankLandingLayout from "@21n/landing/shared/BlankLandingLayout.svelte";
  import { landing } from "@21n/landing/shared/store/shared.store";

  let { data, children }: {
    urls?: any;
    topNavBarValues?: any;
    footerValues?: any;
    isProduct?: boolean;
    children?: Snippet;
  } = $props();

  $effect(() => {
    if (data?.urls) landing.load(data.urls);
  });

  let isComparePage = $derived($page.url.pathname.includes("compare"));
</script>

<BlankLandingLayout
  topNavBarValues={data?.topNavBarValues}
  footerValues={data?.footerValues}
  isProduct={data?.isProduct ?? true}
  {isComparePage}
>
  {@render children?.()}
</BlankLandingLayout>
