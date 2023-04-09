<script>
    import { goto } from "$app/navigation";

    import Button from "$lib/tidy/shared/elements/Button.svelte";
</script>

<div class="flex flex-col gap-24 w-full">
    <div>
        Pomotron is a sub atom from
        <a href="https://tidigit.com"><u>Tidy Digital Kit</u></a> built at Blank
        COOP.
    </div>
    <div class="flex flex-col gap-4 w-3/4 self-center">
        <Button
            label="Pomotron roadmap"
            on:click={() => {
                goto(
                    "https://blankcoop.notion.site/Pomotron-roadmap-37e1f7599d8040c381b4712029db22cb"
                );
            }}
        />
        <Button
            label="Join us on discord"
            on:click={() => {
                goto("https://discord.com/invite/9HJqKYTZKg");
            }}
        />
        <Button
            label="Read more about Blank COOP"
            on:click={() => {
                goto("https://docs.blank.coop");
            }}
        />
    </div>
</div>
