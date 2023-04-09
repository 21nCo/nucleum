<script lang="ts">
    import Button from "$lib/tidy/shared/elements/Button.svelte";
    import { resetLocalStorage } from "$lib/tidy/stores/persistance";
    let clearMessage: string | undefined = undefined;
    function clearStorageHandler() {
        resetLocalStorage();
        clearMessage = "cleared successfully";
        setTimeout(() => {
            clearMessage = undefined;
        }, 3000);
    }
</script>

<div class="flex flex-col gap-4 w-full">
    <div>
        Pomotron uses your local browser to store your data. iCloud and other
        private cloud storage will be available soon
    </div>
    <Button label="clear storage" on:click={clearStorageHandler} />
    <div>{clearMessage ?? ""}</div>
</div>
