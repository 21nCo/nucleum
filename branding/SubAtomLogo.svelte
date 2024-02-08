<script lang="ts">
  import { app, appStore, userPreferences } from "../stores/app.store";
  import { Size } from "../types/size.enum";
  import { extractProduct } from "../utils/utils";
  export let subatom: string | undefined = undefined;
  export let size: Size = Size.md;
  export let isDark: boolean | undefined = undefined;
  if (!subatom) {
    subatom = $app.product;
  }
  $: if (isDark === undefined) {
    isDark = $userPreferences.colorScheme.isDark;
  }
  let color = isDark ? "#FFFFFF" : "#393939";
  const defaults = [
    {
      subatom: "tidigit",
      svg: ``,
    },
    {
      subatom: "pointron",
      svg: `
<rect x="227.1" y="91" width="9" height="144" rx="3.67484" fill="{color}"/>
<rect x="227.1" y="235" width="9" height="142" rx="3.67484" transform="rotate(-90 227.1 235)" fill="{color}"/>
<path d="M128.196 230.5C128.196 173.468 174.429 127.234 231.461 127.234" stroke="{color}" stroke-width="27.5374"/>
<path d="M231.461 333.766C174.429 333.766 128.196 287.532 128.196 230.5" stroke="{color}" stroke-width="27.5374"/>
<path d="M334.725 230.5C334.725 287.532 288.492 333.766 231.46 333.766" stroke="{color}" stroke-width="27.5374"/>`,
    },
    {
      subatom: "goaltron",
      svg: ``,
    },
    {
      subatom: "memotron",
      svg: `<rect x="89.1001" y="235.199" width="9.00001" height="148" rx="3.67484" transform="rotate(-90 89.1001 235.199)" fill="{color}"/>
<path d="M128.124 231.488C128.124 174.456 174.357 128.223 231.389 128.223" stroke="{color}" stroke-width="27.5374"/>
<path d="M231.389 334.754C174.357 334.754 128.124 288.52 128.124 231.489" stroke="{color}" stroke-width="27.5374"/>
<path d="M334.655 231.485C334.655 288.517 288.421 334.75 231.389 334.75" stroke="{color}" stroke-width="27.5374"/>
<path d="M231.39 128.223C288.421 128.223 334.655 174.456 334.655 231.488" stroke="{color}" stroke-width="27.5374"/>`,
    },
    {
      subatom: "selftron",
      svg: ``,
    },
    {
      subatom: "feedtron",
      svg: ``,
    },
    {
      subatom: "hometron",
      svg: ``,
    },
  ];
  $: rawlogo =
    $appStore.appData.logo ??
    defaults.find((l) => subatom?.includes(l.subatom))?.svg ??
    defaults[0].svg;
  $: logo = rawlogo?.replaceAll("{color}", color);
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
    {@html logo}
  </svg>
</button>
