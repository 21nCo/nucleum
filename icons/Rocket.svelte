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
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      class={classList}
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M3.60597 11.9691C3.85946 12.2967 3.79938 12.7678 3.47179 13.0213C2.87925 13.4798 2.5 14.1954 2.5 15C2.5 15.1569 2.51437 15.31 2.54177 15.4582C2.68996 15.4856 2.84307 15.5 3 15.5C3.80458 15.5 4.52023 15.1208 4.97873 14.5282C5.23222 14.2006 5.70328 14.1405 6.03087 14.394C6.35846 14.6475 6.41854 15.1186 6.16505 15.4462C5.4347 16.39 4.2884 17 3 17C2.54003 17 2.09667 16.9221 1.6834 16.778C1.46722 16.7027 1.29728 16.5328 1.22195 16.3166C1.07794 15.9033 1 15.46 1 15C1 13.7116 1.60997 12.5653 2.55383 11.835C2.88142 11.5815 3.35248 11.6415 3.60597 11.9691Z"
    />
    <path
      class={classList}
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M4.75236 11C5.40714 11.8376 6.16237 12.5929 7 13.2476V17.25C7 17.6642 7.33579 18 7.75 18C10.5114 18 12.75 15.7614 12.75 13C12.75 12.5097 12.6792 12.035 12.5471 11.5861C15.8467 9.22968 18 5.36651 18 1C18 0.912337 17.9991 0.824864 17.9974 0.737588C17.9894 0.335017 17.665 0.010579 17.2624 0.00259918C17.1751 0.000869334 17.0877 0 17 0C12.6335 0 8.77032 2.15331 6.41387 5.45291C5.96496 5.32078 5.49028 5.25 5 5.25C2.23858 5.25 0 7.48858 0 10.25C0 10.6642 0.335786 11 0.75 11H4.75236ZM12 8C13.1046 8 14 7.10457 14 6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8Z"
    />
  </svg>
{:else if variant === IconVariant.Solid}
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      class={classList}
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M3.60597 11.9691C3.85946 12.2967 3.79938 12.7678 3.47179 13.0213C2.87925 13.4798 2.5 14.1954 2.5 15C2.5 15.1569 2.51437 15.31 2.54177 15.4582C2.68996 15.4856 2.84307 15.5 3 15.5C3.80458 15.5 4.52023 15.1208 4.97873 14.5282C5.23222 14.2006 5.70328 14.1405 6.03087 14.394C6.35846 14.6475 6.41854 15.1186 6.16505 15.4462C5.4347 16.39 4.2884 17 3 17C2.54003 17 2.09667 16.9221 1.6834 16.778C1.46722 16.7027 1.29728 16.5328 1.22195 16.3166C1.07794 15.9033 1 15.46 1 15C1 13.7116 1.60997 12.5653 2.55383 11.835C2.88142 11.5815 3.35248 11.6415 3.60597 11.9691Z"
    />
    <path
      class={classList}
      style={`opacity: ${opacity}; fill: ${iconFinalColor}`}
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M4.75236 11C5.40714 11.8376 6.16237 12.5929 7 13.2476V17.25C7 17.6642 7.33579 18 7.75 18C10.5114 18 12.75 15.7614 12.75 13C12.75 12.5097 12.6792 12.035 12.5471 11.5861C15.8467 9.22968 18 5.36651 18 1C18 0.912337 17.9991 0.824864 17.9974 0.737588C17.9894 0.335017 17.665 0.010579 17.2624 0.00259918C17.1751 0.000869334 17.0877 0 17 0C12.6335 0 8.77032 2.15331 6.41387 5.45291C5.96496 5.32078 5.49028 5.25 5 5.25C2.23858 5.25 0 7.48858 0 10.25C0 10.6642 0.335786 11 0.75 11H4.75236ZM12 8C13.1046 8 14 7.10457 14 6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8Z"
    />
  </svg>
{/if}
