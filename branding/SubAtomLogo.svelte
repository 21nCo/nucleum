<script lang="ts">
  import { appStore, userPreferences } from "../stores/app.store";
  import { Size } from "../types/size.enum";
  export let subatom: string;
  export let size: Size = Size.md;
  export let isDark: boolean | undefined = undefined;
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
      svg: ``,
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
    defaults.find((l) => subatom.includes(l.subatom))?.svg ??
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
