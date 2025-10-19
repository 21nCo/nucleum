<script lang="ts">
  import ShortcutText from "@21n/elements/text/ShortcutText.svelte";

  export let row: any;
</script>

<ShortcutText shortcut={row.shortcut} isPlainText={true} />
