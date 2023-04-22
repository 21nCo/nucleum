<script lang="ts">
    import Button from "$lib/tidy/elements/Button.svelte";
    import { resetLocalStorage } from "$lib/tidy/stores/persistance";
    import {
        appStore,
        sessionStore,
        userPreferences,
    } from "$lib/tidy/stores/stores";
    import type { UserPreferences } from "$lib/tidy/types/preferences.type";
    import type { Session } from "$lib/tidy/types/session.type";
    import { removeDuplicatesById } from "../utils";
    let clearMessage: string | undefined = undefined;
    let fileInput: HTMLInputElement;
    function clearStorageHandler() {
        resetLocalStorage();
        clearMessage = "cleared successfully";
        setTimeout(() => {
            clearMessage = undefined;
        }, 3000);
    }
    function exportSessionData() {
        let sessions = window?.localStorage.getItem("Sessions");
        if (!sessions) return;
        const dataJSON = sessions;
        download(dataJSON, "sessions");
    }
    function exportPreferencs() {
        let preferences = window?.localStorage.getItem("UserPreferences");
        if (!preferences) return;
        const dataJSON = preferences;
        download(dataJSON, "preferences");
    }
    function download(data: string, label: string | null = null) {
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = (label ?? "data") + ".json";
        link.click();
        URL.revokeObjectURL(url);
    }
    async function importJSON() {
        if (!fileInput.files) return;
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = event.target?.result;
                if (!importedData) return;
                const jsonData = JSON.parse(importedData as string);
                console.log(jsonData);
                if (isValidUserPreferences(jsonData)) {
                    console.log("Importing User preferences");
                    userPreferences.set(jsonData);
                } else if (isListOfSessions(jsonData)) {
                    console.log("Importing session data");
                    let existingSessions = [];
                    let sessionStorage =
                        window?.localStorage.getItem("Sessions");
                    if (sessionStorage) {
                        existingSessions = JSON.parse(sessionStorage);
                    }
                    let sessions = [...existingSessions, ...jsonData];
                    sessions = removeDuplicatesById(sessions);
                    console.log({ existingSessions, sessions });
                    window.localStorage.setItem(
                        "Sessions",
                        JSON.stringify(sessions)
                    );
                    sessionStore.reload();
                }
            } catch (error) {
                console.error("Error parsing JSON file:", error);
            }
        };
        reader.readAsText(file);
    }
    function isValidUserPreferences(item: any): item is UserPreferences {
        return (
            item &&
            typeof item.theme === "string" &&
            typeof item.nickName === "string"
        );
    }
    function isValidSessionType(item: any): item is Session {
        return (
            item &&
            typeof item.elapsed === "number" &&
            typeof item.start === "number"
        );
    }

    function isListOfSessions(data: any): data is Session[] {
        return Array.isArray(data) && data.every(isValidSessionType);
    }
</script>

<div class="flex flex-col gap-8 w-full">
    <div class="flex flex-col gap-1">
        <div>Export</div>
        <div class="flex gap-2">
            <Button
                label={"Export session data (JSON)"}
                on:click={exportSessionData}
            />
            <Button
                label={"Export preferences (JSON)"}
                on:click={exportPreferencs}
            />
        </div>
    </div>
    <div class="flex flex-col gap-1">
        <div>Import</div>
        <div class="flex gap-2">
            <input
                type="file"
                on:change={importJSON}
                bind:this={fileInput}
                accept=".json"
                class="..."
                style="display:none"
            />
            <Button
                on:click={() => fileInput.click()}
                label={"Import session data"}
            />
            <Button
                on:click={() => fileInput.click()}
                label={"Import preferences"}
            />
        </div>
    </div>
    <div>
        {$appStore.appName} uses your local browser to store your data. iCloud and
        other private cloud storage will be available soon
    </div>
    <Button label="clear storage" on:click={clearStorageHandler} />
    <div>{clearMessage ?? ""}</div>
</div>
