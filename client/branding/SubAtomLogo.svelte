<script lang="ts">
  import { onMount } from "svelte";
  import { ClientStorageKey } from "../persistence/persistence.type";
  import { clientStorage } from "../persistence/persistence.utils";
  import { Size } from "../types/size.enum";
  export let subatom: string | undefined = undefined;
  export let size: Size.sm | Size.md = Size.md;

  onMount(async () => {
    if (!subatom)
      subatom =
        (await clientStorage.get(ClientStorageKey.PRODUCT)) ?? "tidigit";
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

      <!-- hex center thin -->
      <!-- <path
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
      /> -->

      <!-- hex center oval -->
      <!-- <path
        d="M262.9 125.563L305.178 149.972C319.869 158.454 324.818 161.472 328.332 165.374C331.707 169.123 334.258 173.54 335.817 178.338C337.439 183.332 337.578 189.128 337.578 206.09V254.91C337.578 271.872 337.439 277.668 335.817 282.662C334.258 287.46 331.707 291.877 328.332 295.626C324.818 299.528 319.869 302.546 305.178 311.028L262.9 335.437C248.21 343.919 243.121 346.696 237.985 347.788C233.05 348.837 227.95 348.837 223.015 347.788C217.879 346.696 212.79 343.919 198.1 335.437L155.822 311.028C141.131 302.546 136.182 299.528 132.668 295.626C129.293 291.877 126.742 287.46 125.183 282.662C123.561 277.668 123.422 271.872 123.422 254.91V206.09C123.422 189.128 123.561 183.332 125.183 178.338C126.742 173.54 129.293 169.123 132.668 165.374C136.182 161.472 141.131 158.454 155.822 149.972L198.1 125.563C212.79 117.081 217.879 114.304 223.015 113.212C227.95 112.163 233.05 112.163 237.985 113.212C243.121 114.304 248.21 117.081 262.9 125.563Z"
        stroke="#393939"
        stroke-width="24"
      />
      <rect x="222" y="206" width="18" height="50" rx="9" fill="#393939" /> -->

      <!--hex empty-->
      <path
        d="M244.363 128.303L313.89 168.445C321.54 172.862 326.253 181.025 326.253 189.858V270.142C326.253 278.975 321.54 287.138 313.89 291.555L244.363 331.697C236.713 336.113 227.287 336.113 219.637 331.697L150.11 291.555C142.46 287.138 137.747 278.975 137.747 270.142V189.858C137.747 181.025 142.46 172.862 150.11 168.445L219.637 128.303C227.287 123.887 236.713 123.887 244.363 128.303Z"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="28"
      />
    {/if}
  </svg>
</button>
