<script lang="ts">
  export let primary: number = 0;
  export let secondary: number = 0;
  export let size: number = 12;
  export let strokeWidth: number = 2;
  export let primaryColor: string = "stroke-fgs1";
  export let secondaryColor: string = "stroke-fgs2";
  export let secondaryOpacity: number = 0.3;

  $: total = primary + secondary;
  $: primaryPercentage = total > 0 ? (primary / total) * 100 : 0;
  $: secondaryPercentage = total > 0 ? (secondary / total) * 100 : 0;
  $: radius = (size - strokeWidth) / 2;
  $: circumference = 2 * Math.PI * radius;
  $: primaryStrokeDasharray = `${(primaryPercentage / 100) * circumference} ${circumference}`;
  $: secondaryStrokeDasharray = `${(secondaryPercentage / 100) * circumference} ${circumference}`;
  $: secondaryStrokeDashoffset = -((primaryPercentage / 100) * circumference);
</script>

<svg
  width={size}
  height={size}
  class="transform -rotate-90"
  viewBox="0 0 {size} {size}"
>
  <!-- Primary circle -->
  {#if primaryPercentage > 0}
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      class={primaryColor}
      stroke-width={strokeWidth}
      fill="none"
      stroke-dasharray={primaryStrokeDasharray}
      stroke-linecap="round"
    />
  {/if}

  <!-- Secondary circle -->
  {#if secondaryPercentage > 0}
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      class={secondaryColor}
      stroke-width={strokeWidth}
      fill="none"
      stroke-dasharray={secondaryStrokeDasharray}
      stroke-dashoffset={secondaryStrokeDashoffset}
      stroke-linecap="round"
      opacity={secondaryOpacity}
    />
  {/if}
</svg>
