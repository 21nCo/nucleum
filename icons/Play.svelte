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
    width="13"
    height="16"
    viewBox="0 0 13 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.29995 0.840949C1.3011 0.211238 0 0.929056 0 2.10984V13.891C0 15.0718 1.3011 15.7896 2.29995 15.1599L11.6436 9.2693C12.577 8.68085 12.577 7.31997 11.6436 6.73152L2.29995 0.840949Z"
      class={classList}
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
    />
  </svg>
{:else if variant === IconVariant.Solid}
  <svg
    width="13"
    height="16"
    viewBox="0 0 13 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.29995 0.840949C1.3011 0.211238 0 0.929056 0 2.10984V13.891C0 15.0718 1.3011 15.7896 2.29995 15.1599L11.6436 9.2693C12.577 8.68085 12.577 7.31997 11.6436 6.73152L2.29995 0.840949Z"
      class={classList}
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
    />
  </svg>
{/if}
