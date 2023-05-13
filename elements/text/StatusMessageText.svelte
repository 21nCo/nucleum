<script lang="ts">
  import {
    StatusMessageType,
    type StatusMessage,
  } from "$lib/tidy/types/statusMessage.type";
  import { onMount } from "svelte";
  export let message: StatusMessage;
  $: {
    if (message.message) {
      setTimeout(() => {
        message.message = undefined;
        message.type = StatusMessageType.DEFAULT;
      }, 3000);
    }
  }
</script>

{#if message?.message}
  <div
    class="text-center {message?.type === StatusMessageType.ERROR
      ? 'text-red'
      : message?.type === StatusMessageType.SUCCESS
      ? 'text-green'
      : ''}"
  >
    {message?.message}
  </div>
{/if}
