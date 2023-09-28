<script lang="ts">
  export let label: string;
  //   export let id: string;
  export let classList: string = "";
  export let activeClassList: string = "";
  export let isActive: boolean = false;
  export let style: string = "";
</script>

<button
  {style}
  on:click
  class={`w-fit whitespace-nowrap text-b2 border-[1px] rounded-[4px] py-1.5 px-3 ${classList} ${
    isActive
      ? `bg-accent1 ${activeClassList}`
      : `bg-transparent text-fgs1 border-fgs2`
  }`}
>
  {label}
</button>
