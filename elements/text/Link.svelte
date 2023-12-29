<script lang="ts">
  export let href: any;
  export let label: string;
  export let feedback: string = "arrow";
  export let isSameTab: boolean = false;
  let isHovering: boolean = false;
</script>

<a
  class="relative hover:text-a1 underline {feedback === 'underline'
    ? 'hover:underline'
    : ''}"
  {href}
  target={isSameTab ? "_self" : "_blank"}
  on:mouseenter={() => (isHovering = true)}
  on:mouseleave={() => (isHovering = false)}
  >{label}
  <!-- {#if isHovering && feedback == "arrow"}
    <div class="absolute -right-5 top-1 text-a1 -rotate-45 text-b2">→</div>
  {/if} -->
</a>
