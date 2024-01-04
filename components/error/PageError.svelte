<script lang="ts">
  import { page } from "$app/stores";
</script>

<main class="flex flex-col w-full justify-center items-center grow">
  <h1 class="font-medium text-title text-fgs3">{$page.status}</h1>
  <div class="text-fgs2">{$page.error?.message}</div>
</main>
