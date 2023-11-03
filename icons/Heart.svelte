<script lang="ts">
  import { afterUpdate } from "svelte";
  import { IconVariant } from "../types/icon.type";

  export let color: string = "";
  export let opacity: number = 1;
  export let classList: string = "";
  export let isActive: boolean = false;
  export let activeColor: string = "";

  export let variant: IconVariant = IconVariant.Outline;

  let iconFinalColor: string = "";

  function setColor() {
    iconFinalColor = isActive
      ? activeColor
        ? activeColor
        : color
        ? color
        : `rgba(var(--colors-bgs1),${opacity})`
      : color
      ? color
      : `rgba(var(--colors-fgs1),${opacity})`;
  }
  afterUpdate(() => {
    setColor();
  });
</script>

{#if variant === IconVariant.Outline}
  <!-- <svg
    width="15"
    height="13"
    viewBox="0 0 15 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  > -->
  <path
    class={classList}
    style={`opacity: ${opacity}; stroke: ${iconFinalColor}`}
    d="M13.875 3.84375C13.875 2.08334 12.3884 0.65625 10.5547 0.65625C9.18362 0.65625 8.00666 1.45403 7.5 2.59242C6.99334 1.45403 5.81638 0.65625 4.44531 0.65625C2.61155 0.65625 1.125 2.08334 1.125 3.84375C1.125 8.95831 7.5 12.3438 7.5 12.3438C7.5 12.3438 13.875 8.95831 13.875 3.84375Z"
    stroke-width="1.0625"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <!-- </svg> -->
{:else if variant === IconVariant.Solid}
  <!-- <svg
    width="16"
    height="15"
    viewBox="0 0 16 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  > -->
  <path
    class={classList}
    style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
    d="M7.65298 13.9149L7.6476 13.9121L7.62912 13.9024C7.61341 13.8941 7.59102 13.8822 7.56238 13.8667C7.50511 13.8358 7.42281 13.7907 7.31906 13.732C7.11164 13.6146 6.81794 13.4425 6.46663 13.2206C5.76556 12.7777 4.82731 12.1314 3.88539 11.3197C2.04447 9.73318 0 7.35227 0 4.5C0 2.01472 2.01472 0 4.5 0C5.9144 0 7.17542 0.652377 8 1.67158C8.82458 0.652377 10.0856 0 11.5 0C13.9853 0 16 2.01472 16 4.5C16 7.35227 13.9555 9.73318 12.1146 11.3197C11.1727 12.1314 10.2344 12.7777 9.53337 13.2206C9.18206 13.4425 8.88836 13.6146 8.68094 13.732C8.57719 13.7907 8.49489 13.8358 8.43762 13.8667C8.40898 13.8822 8.38659 13.8941 8.37088 13.9024L8.3524 13.9121L8.34702 13.9149L8.34531 13.9158C8.13 14.03 7.87 14.03 7.65529 13.9161L7.65298 13.9149Z"
  />
  <!-- </svg> -->
{:else if variant === IconVariant.Mini}
  <!-- <svg
    width="16"
    height="15"
    viewBox="0 0 16 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  > -->
  <path
    class={classList}
    style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
    d="M7.65298 13.9149L7.6476 13.9121L7.62912 13.9024C7.61341 13.8941 7.59102 13.8822 7.56238 13.8667C7.50511 13.8358 7.42281 13.7907 7.31906 13.732C7.11164 13.6146 6.81794 13.4425 6.46663 13.2206C5.76556 12.7777 4.82731 12.1314 3.88539 11.3197C2.04447 9.73318 0 7.35227 0 4.5C0 2.01472 2.01472 0 4.5 0C5.9144 0 7.17542 0.652377 8 1.67158C8.82458 0.652377 10.0856 0 11.5 0C13.9853 0 16 2.01472 16 4.5C16 7.35227 13.9555 9.73318 12.1146 11.3197C11.1727 12.1314 10.2344 12.7777 9.53337 13.2206C9.18206 13.4425 8.88836 13.6146 8.68094 13.732C8.57719 13.7907 8.49489 13.8358 8.43762 13.8667C8.40898 13.8822 8.38659 13.8941 8.37088 13.9024L8.3524 13.9121L8.34702 13.9149L8.34531 13.9158C8.13 14.03 7.87 14.03 7.65529 13.9161L7.65298 13.9149Z"
  />
  <!-- </svg> -->
{/if}
