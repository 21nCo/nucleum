<script>
  export let href = "";
  export let title = undefined;
</script>

<a
  {href}
  {title}
  class="text-aps1 hover:underline"
  target={href.startsWith("http") ? "_blank" : "_self"}
  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
  on:click|stopPropagation
>
  <slot />
</a>
