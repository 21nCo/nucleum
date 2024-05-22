<script lang="ts">
  import SubAtomLogo from "$lib/tidy/branding/SubAtomLogo.svelte";

  export let status: string = "";
</script>

<div class="flex flex-col w-full h-full justify-center items-center">
  <SubAtomLogo />
  <div class="text-h3 font-medium">Login successful.</div>
  <div class="text-fgs2">You can close this tab now.</div>
</div>
