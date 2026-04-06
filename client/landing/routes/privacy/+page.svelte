<script>
  import PrivacyPolicy from "@21n/landing/shared/PrivacyPolicy.svelte";
  let { data } = $props();
</script>

<PrivacyPolicy productName={data.product} />
