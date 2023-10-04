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
  <!-- Need to add outlined version -->
  <svg
    width="18"
    height="14"
    viewBox="0 0 18 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1 0C0.447715 0 0 0.447715 0 1V2C0 2.55228 0.447716 3 1 3H17C17.5523 3 18 2.55228 18 2V1C18 0.447715 17.5523 0 17 0H1Z"
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M1 4.5H17L16.1885 12.2094C16.0813 13.2273 15.223 14 14.1995 14H3.80052C2.77701 14 1.91866 13.2273 1.81151 12.2094L1 4.5ZM6 8C6 7.44771 6.44772 7 7 7H11C11.5523 7 12 7.44771 12 8C12 8.55228 11.5523 9 11 9H7C6.44772 9 6 8.55228 6 8Z"
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
    />
  </svg>
{:else if variant === IconVariant.Solid}
  <svg
    width="18"
    height="14"
    viewBox="0 0 18 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1 0C0.447715 0 0 0.447715 0 1V2C0 2.55228 0.447716 3 1 3H17C17.5523 3 18 2.55228 18 2V1C18 0.447715 17.5523 0 17 0H1Z"
      class={classList}
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      class={classList}
      d="M1 4.5H17L16.1885 12.2094C16.0813 13.2273 15.223 14 14.1995 14H3.80052C2.77701 14 1.91866 13.2273 1.81151 12.2094L1 4.5ZM6 8C6 7.44771 6.44772 7 7 7H11C11.5523 7 12 7.44771 12 8C12 8.55228 11.5523 9 11 9H7C6.44772 9 6 8.55228 6 8Z"
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
    />
  </svg>
{/if}
