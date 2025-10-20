<script lang="ts">
  import { ButtonVariant } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import Button from "@21n/elements/button/Button.svelte";
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let type: ButtonVariant = ButtonVariant.PRIMARY;
  export let parentBackgroundIndex: number = 1;
  export let accept: string = "image/*";
  let inputElement: HTMLInputElement;
  function triggerFileInput() {
    // const inputElement = document.getElementById("myFile");
    inputElement?.click();
  }
</script>

<input
  style="display:none;"
  type="file"
  bind:this={inputElement}
  name="filename"
  {accept}
  on:input
/>
<Button
  icon="upload"
  label="Upload"
  {size}
  {type}
  parentBgIndex={parentBackgroundIndex}
  on:click={triggerFileInput}
/>
