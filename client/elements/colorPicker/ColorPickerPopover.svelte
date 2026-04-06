<script lang="ts">
  import ColorPicker from "@21n/elements/colorPicker/ColorPicker.svelte";
  let {
    hue,
    onChangeCallback,
    onDebouncedChangeCallback,
    isShowPreview = true
  }: any = $props();
</script>

<div class="w-80 p-4 bg-bgs1 rounded-md">
  <ColorPicker
    {hue}
    {onChangeCallback}
    {onDebouncedChangeCallback}
    {isShowPreview}
  />
</div>
