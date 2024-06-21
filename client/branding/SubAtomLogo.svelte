<script lang="ts">
  import { Size } from "../types/size.enum";
  export let subatom: string | undefined = undefined;
  export let size: Size = Size.md;
  if (!subatom) {
    subatom = localStorage.getItem("subatom") ?? "tidigit";
  }
  let height = size === Size.md ? 61 : size === Size.sm ? 20 : Size.xs ? 4 : 61;
</script>

<button on:click>
  <svg
    {height}
    width={height}
    viewBox="0 0 462 462"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {#if subatom === "pointron"}
      <path
        d="M231.36 127.234C288.392 127.234 334.625 173.468 334.625 230.5"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M128.096 230.5C128.096 173.468 174.329 127.234 231.361 127.234"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M231.361 333.766C174.329 333.766 128.096 287.532 128.096 230.5"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M334.625 230.5C334.625 287.532 288.392 333.766 231.36 333.766"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
    {:else if subatom === "memotron"}
      <rect
        x="89.1001"
        y="235.199"
        width="9.00001"
        height="148"
        rx="3.67484"
        transform="rotate(-90 89.1001 235.199)"
        class="fill-logo-dark dark:fill-logo-light"
      />
      <path
        d="M128.124 231.488C128.124 174.456 174.357 128.223 231.389 128.223"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M231.389 334.754C174.357 334.754 128.124 288.52 128.124 231.489"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M334.655 231.485C334.655 288.517 288.421 334.75 231.389 334.75"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M231.39 128.223C288.421 128.223 334.655 174.456 334.655 231.488"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
    {/if}
  </svg>
</button>
