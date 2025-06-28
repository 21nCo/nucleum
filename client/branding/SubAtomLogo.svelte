<script lang="ts">
  import { onMount } from "svelte";
  import { ClientStorageKey } from "../persistence/persistence.type";
  import { clientStorage } from "../persistence/persistence.utils";
  import { Size } from "../types/size.enum";
  import { cn } from "../utils/ui.utils";
  export let subatom: string | undefined = undefined;
  export let size: Size.sm | Size.md | Size.xs = Size.md;

  onMount(async () => {
    if (!subatom)
      subatom =
        (await clientStorage.get(ClientStorageKey.PRODUCT)) ?? "tidigit";
  });
  $: height = size === Size.md ? 61 : size === Size.sm ? 40 : 61;
</script>

<button on:click>
  <svg
    class={cn({
      "w-16 h-16": size === Size.md,
      "w-8 h-8": size === Size.sm,
      "w-6 h-6": size === Size.xs
    })}
    viewBox="0 0 462 462"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {#if subatom === "nucleus"}
      <path
        d="M287.977 130.92C271.068 121.139 251.436 115.541 230.497 115.541C167.008 115.541 115.539 167.01 115.539 230.499C115.539 265.712 131.371 297.227 156.305 318.315M184.195 335.752C198.36 341.993 214.024 345.458 230.497 345.458C293.987 345.458 345.456 293.989 345.456 230.499C345.456 198.826 332.647 170.145 311.926 149.353"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="11.125"
        stroke-linecap="round"
      />
      <circle
        cx="230.499"
        cy="230.509"
        r="51.0926"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="11.125"
      />
      <circle
        cx="230.119"
        cy="230.121"
        r="18.4963"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="11.125"
      />
      <circle
        cx="230.491"
        cy="230.504"
        r="83.0255"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="11.125"
      />
    {:else if subatom === "nucleus1"}
      <path
        d="M288.977 131.9204C272.068 122.1392 252.436 116.541 231.497 116.541C168.0077 116.541 116.5391 168.0096 116.5391 231.499C116.5391 266.712 132.3712 298.227 157.3055 319.315M185.1947 336.752C199.36 342.993 215.024 346.458 231.497 346.458C294.987 346.458 346.456 294.989 346.456 231.499C346.456 199.826 333.647 171.1449 312.926 150.3528"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="11.125"
        stroke-linecap="round"
      />
      <circle
        cx="231.499"
        cy="231.509"
        r="51.0926"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="11.125"
      />
      <circle
        cx="231.117"
        cy="231.121"
        r="18.4963"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="11.125"
      />
      <circle
        cx="231.49"
        cy="231.504"
        r="83.0255"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="11.125"
      />
      <circle
        cx="313.033"
        cy="116.4905"
        r="10.1276"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="5.52414"
      />
      <circle
        cx="333.48"
        cy="140.6455"
        r="5.5625"
        class="fill-logo-dark dark:fill-logo-light"
      />
      <circle
        cx="114.6875"
        cy="151.7705"
        r="5.5625"
        class="fill-logo-dark dark:fill-logo-light"
      />
      <circle
        cx="107.26953"
        cy="185.1455"
        r="5.5625"
        class="fill-logo-dark dark:fill-logo-light"
      />
      <circle
        cx="107.26953"
        cy="311.229"
        r="5.5625"
        class="fill-logo-dark dark:fill-logo-light"
      />
      <circle
        cx="155.4805"
        cy="352.021"
        r="5.5625"
        class="fill-logo-dark dark:fill-logo-light"
      />
      <circle
        cx="281.562"
        cy="107.27051"
        r="5.5625"
        class="fill-logo-dark dark:fill-logo-light"
      />
      <circle
        cx="120.1006"
        cy="340.987"
        r="15.6517"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="5.52414"
      />
    {:else if subatom === "pointron"}
      <circle
        cx="232"
        cy="230"
        r="95"
        class="stroke-logo-dark dark:stroke-logo-light"
        stroke-width="28"
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
