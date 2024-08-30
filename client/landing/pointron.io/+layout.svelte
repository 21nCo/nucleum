<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";

  let topNavBarValues: any = {
    icon: "blank-coop",
    title: "Pointron",
    items: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" }
    ],
    cta: {
      label: "Sign Up",
      href: "/signup"
    }
  };
</script>

<BlankLandingLayout {topNavBarValues}>
  <slot />
</BlankLandingLayout>
