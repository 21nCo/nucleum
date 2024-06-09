<script lang="ts">
  import { ButtonVariant } from "$lib/tidy/types/button.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import Button from "./Button.svelte";
  export let size: Size = Size.md;
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
  style="visibility:hidden;height:0px;width:0px;"
  type="file"
  bind:this={inputElement}
  name="filename"
  {accept}
  on:input
/>
<Button
  icon="upload"
  label="Upload"
  classList="ml-auto"
  {size}
  {type}
  {parentBackgroundIndex}
  on:click={triggerFileInput}
/>
