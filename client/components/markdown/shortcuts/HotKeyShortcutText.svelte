<script lang="ts">
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";

  export let row: any;
</script>

<ShortcutText shortcut={row.shortcut} isPlainText={true} />
