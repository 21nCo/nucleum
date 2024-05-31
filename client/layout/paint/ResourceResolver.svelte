<script lang="ts">
  import ComponentResolver from "./ComponentResolver.svelte";
  export let id: string;
  export let isFromSplitView: boolean = false;
  export let componentParams: any = {};
</script>

<ComponentResolver
  path={id.split(":")[0]}
  params={{ id, isFromSplitView, ...componentParams }}
/>
