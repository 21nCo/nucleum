<script lang="ts">
  import SomethingWentWrongIllustration from "$lib/client/illustrations/SomethingWentWrongIllustration.svelte";
  export let error: string | undefined = undefined;
  export let subText: string | undefined = undefined;
</script>

<div class="flex flex-col gap-6 justify-center items-center w-full h-full">
  <div class="w-32 h-32 mt-auto">
    <SomethingWentWrongIllustration />
  </div>
  <div class="flex flex-col gap-1 items-center">
    <div class="text-ars1 font-medium text-h4">
      {error ?? "Something went wrong."}
    </div>
    <div class="text-b2 text-fgs3">
      {subText ?? "Please try again later."}
    </div>
  </div>
  <div class="text-b3 text-fgs3 mt-auto pb-8 px-2 text-center">
    Please contact us at <a
      class="text-aps1 font-medium"
      href="mailto:hello@21n.org">hello@21n.org</a
    > if you need any assistance.
  </div>
</div>
