<script lang="ts">
  export let width: number;
  export let variant: "v1" | "v2" = "v2";
</script>

{#if variant === "v1"}
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
{:else}
  <path
    d="M287.977 130.92C271.068 121.139 251.436 115.541 230.497 115.541C167.008 115.541 115.539 167.01 115.539 230.499C115.539 265.712 131.371 297.227 156.305 318.315M184.195 335.752C198.36 341.993 214.024 345.458 230.497 345.458C293.987 345.458 345.456 293.989 345.456 230.499C345.456 198.826 332.647 170.145 311.926 149.353"
    class="stroke-logo-dark dark:stroke-logo-light"
    stroke-width="11.125"
    stroke-linecap="round"
  />
  <path
    d="M193.995 195.002C187.835 201.152 183.161 208.957 180.746 217.97C173.423 245.299 189.641 273.389 216.97 280.712C232.127 284.773 247.519 281.594 259.471 273.293M270.194 263.299C274.514 257.921 277.812 251.579 279.712 244.488C287.035 217.159 270.817 189.068 243.488 181.746C229.854 178.093 216.031 180.298 204.691 186.819"
    class="stroke-logo-dark dark:stroke-logo-light"
    stroke-width="11.125"
    stroke-linecap="round"
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
{/if}
