<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";
  import { addAnimateClass } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";

  let topNavBarValues: any = {
    icon: "pointron",
    title: "Pointron",
    items: [
      { label: "Discord", href: "https://discord.gg/blanklabs" },
      { label: "Road map", href: "/blog" },
      { label: "Pricing", href: "/pricing" }
    ],
    cta: {
      label: "Aceess Web",
      href: "https://app.pointron.io"
    }
  };
  const id = "pointron-page";
  onMount(async () => {
    await addAnimateClass("animate-open-left", id);
  });
</script>

<BlankLandingLayout {id} {topNavBarValues}>
  <slot />
</BlankLandingLayout>
