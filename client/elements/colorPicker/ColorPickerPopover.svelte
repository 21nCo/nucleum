<script lang="ts">
  import ColorPicker from "@21n/elements/colorPicker/ColorPicker.svelte";
  export let hue: number;
  export let onChangeCallback: (value: number | string) => void;
  export let onDebouncedChangeCallback: (value: number | string) => void;
  export let isShowPreview: boolean = true;
</script>

<div class="w-80 p-4 bg-bgs1 rounded-md">
  <ColorPicker
    {hue}
    {onChangeCallback}
    {onDebouncedChangeCallback}
    {isShowPreview}
  />
</div>
