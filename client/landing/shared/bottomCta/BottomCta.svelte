<script lang="ts">
  import Button from "../elements/Button.svelte";
  export let body: string =
    "Sign up for a free trial and see how Pointron can help you get more done.";
  export let primaryAction: { label: string; href: string };
  export let secondaryAction: { label: string; href: string } | undefined =
    undefined;
</script>

<div class="flex flex-col gap-16 max-w-2xl mx-auto">
  <!-- TODO multi device animation -->
  <div class="flex flex-col gap-2">
    <p class="text-lb2 text-fgs2 text-center">{body}</p>
  </div>
  <div class="flex w-full justify-center gap-2">
    <Button label={primaryAction.label} />
    {#if secondaryAction}
      <Button label={secondaryAction.label} type="secondary" />
    {/if}
  </div>
</div>
