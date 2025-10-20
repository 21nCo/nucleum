<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
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
