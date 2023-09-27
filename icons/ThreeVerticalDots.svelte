<script lang="ts">
  export let color: string = "";
  export let opacity: number = 1;
</script>

<svg
  width="4"
  height="16"
  viewBox="0 0 4 16"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    style={color
      ? `stroke: ${color}`
      : `stroke: rgba(var(--colors-fgs1),${opacity})`}
    d="M2 2.75C1.58579 2.75 1.25 2.41421 1.25 2C1.25 1.58579 1.58579 1.25 2 1.25C2.41421 1.25 2.75 1.58579 2.75 2C2.75 2.41421 2.41421 2.75 2 2.75Z"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path
    style={color
      ? `stroke: ${color}`
      : `stroke: rgba(var(--colors-fgs1),${opacity})`}
    d="M2 8.75C1.58579 8.75 1.25 8.41421 1.25 8C1.25 7.58579 1.58579 7.25 2 7.25C2.41421 7.25 2.75 7.58579 2.75 8C2.75 8.41421 2.41421 8.75 2 8.75Z"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path
    style={color
      ? `stroke: ${color}`
      : `stroke: rgba(var(--colors-fgs1),${opacity})`}
    d="M2 14.75C1.58579 14.75 1.25 14.4142 1.25 14C1.25 13.5858 1.58579 13.25 2 13.25C2.41421 13.25 2.75 13.5858 2.75 14C2.75 14.4142 2.41421 14.75 2 14.75Z"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
