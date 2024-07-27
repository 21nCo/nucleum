<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  export let parentBgIndex: number = 1;
</script>

<div class="ml-auto">
  <Button
    label="Today"
    {parentBgIndex}
    size={Size.xs}
    style={ButtonStyle.OUTLINED}
    on:click
  />
</div>
