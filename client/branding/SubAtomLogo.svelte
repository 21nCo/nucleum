<script lang="ts">
  import { onMount } from "svelte";
  import { ClientStorageKey } from "../persistence/persistence.type";
  import { clientStorage } from "../persistence/persistence.utils";
  import { Size } from "../types/size.enum";
  export let subatom: string | undefined = undefined;
  export let size: Size.sm | Size.md = Size.md;

  onMount(async () => {
    subatom = (await clientStorage.get(ClientStorageKey.PRODUCT)) ?? "tidigit";
  });
  $: height = size === Size.md ? 61 : size === Size.sm ? 40 : 61;
</script>

<button on:click>
  <svg
    class="w-16 h-16"
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
      <!-- <rect
        x="192.756"
        y="280.025"
        width="12.3829"
        height="123.417"
        rx="6.19147"
        transform="rotate(-135 192.756 280.025)"
        class="fill-logo-dark dark:fill-logo-light"
      />
      <path
        d="M231.711 334.977C174.679 334.977 128.445 288.743 128.445 231.711"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M334.977 231.711C334.977 288.743 288.743 334.977 231.711 334.977"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M231.707 128.445C288.739 128.445 334.973 174.679 334.973 231.71"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      />
      <path
        d="M128.445 231.71C128.445 174.679 174.679 128.445 231.711 128.445"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="27.5374"
      /> -->
      <path
        d="M245.835 115.627L322.316 159.782C331.805 165.261 337.651 175.386 337.651 186.344V274.656C337.651 285.614 331.805 295.739 322.316 301.218L245.835 345.373C236.346 350.852 224.654 350.852 215.165 345.373L138.684 301.218C129.195 295.739 123.349 285.614 123.349 274.656V186.344C123.349 175.386 129.195 165.261 138.684 159.782L215.165 115.627C224.654 110.148 236.346 110.148 245.835 115.627Z"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="23.855"
      />
      <rect
        x="225"
        y="191"
        width="12"
        height="80"
        rx="6"
        class="fill-logo-dark dark:fill-logo-light"
      />
    {/if}
  </svg>
</button>
