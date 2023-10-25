<script lang="ts">
  import { Size } from "../types/size.enum";

  export let fill = "fgs1";
  export let size: Size = Size.md;
  let height = size === Size.md ? 61 : size === Size.sm ? 20 : Size.xs ? 4 : 61;
</script>

<svg
  {height}
  width={height * 3.561}
  viewBox="0 0 217 61"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect y="12.0555" width="192.889" height="24.1111" class="fill-{fill}" />
  <rect
    x="181.101"
    y="48.4901"
    width="35.8988"
    height="12.0556"
    class="fill-{fill}"
  />
  <rect
    x="204.945"
    y="60.2778"
    width="60.2778"
    height="12.0556"
    transform="rotate(-90 204.945 60.2778)"
    class="fill-{fill}"
  />
</svg>
