<script>
  // import PropertiesEditor from "$lib/client/products/memotron/curation/collection/properties/PropertiesEditor.svelte";
  import RiveAnimatedIcon from "$lib/client/icons/RiveAnimatedIcon.svelte";
  import CaretPlay from "./CaretPlay.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
</script>

<div class="flex w-full h-full justify-center items-start p-8">
  <!-- <CaretPlay /> -->
  <!-- <PropertiesEditor /> -->
  <Button isLoading={true} label="something" type={ButtonVariant.SECONDARY} />
  <!-- <RiveAnimatedIcon /> -->
</div>
