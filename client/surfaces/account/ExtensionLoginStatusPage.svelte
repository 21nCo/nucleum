<script lang="ts">
  import { requireProductLogo } from "@nucleum/shared-state/product/product-presentation-host";
  const SubAtomLogo = requireProductLogo();
  let { status = "" }: { status?: string } = $props();
  void status;
</script>

<div class="flex flex-col w-full h-full justify-center items-center">
  <SubAtomLogo />
  <div class="text-h3 font-medium">Login successful.</div>
  <div class="text-fgs2">You can close this tab now.</div>
</div>
