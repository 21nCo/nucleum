<script lang="ts">
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/ui/elements/button/button.type";
  import { Size } from "@21n/ui/elements/size.enum";
  let {
    parentBgIndex = 1,
    onclick = undefined
  }: {
    parentBgIndex?: number;
    onclick?: ((event: MouseEvent) => void) | undefined;
  } = $props();
</script>

<div class="ml-auto">
  <Button
    label="Today"
    {parentBgIndex}
    size={Size.xs}
    style={ButtonStyle.OUTLINED}
    {onclick}
  />
</div>
