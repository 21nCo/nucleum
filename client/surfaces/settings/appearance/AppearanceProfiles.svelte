<script lang="ts">
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/ui/elements/button/button.type";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import FormControlLabelWrapper from "@21n/ui/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import AppearanceProfileCard from "@nucleum/surfaces/settings/appearance/AppearanceProfileCard.svelte";
  import AppearanceProfileNameEditor from "@nucleum/surfaces/settings/appearance/AppearanceProfileNameEditor.svelte";
  import {
    appearanceProfiles,
    applyAppearanceProfile,
    deleteAppearanceProfile,
    renameAppearanceProfile,
    saveAppearanceProfileAsNew,
    updateAppearanceProfile
  } from "@nucleum/shared-state/appearance/appearance-profiles";

  type NameEditor = { mode: "new" } | { mode: "rename"; id: string };

  let editor = $state<NameEditor | null>(null);

  const applied = $derived($appearanceProfiles.applied);
  const isModified = $derived($appearanceProfiles.isModified);
</script>

<FormControlLabelWrapper
  props={{ label: "Profile", orientation: Orientation.Vertical }}
>
  <div
    class="flex flex-col gap-4 w-full mt-2"
    data-testid="appearance-profiles"
  >
    <div
      class="flex flex-col gap-2 w-full"
      role="group"
      aria-label="Appearance profiles"
    >
      {#each $appearanceProfiles.profiles as profile (profile.id)}
        <AppearanceProfileCard
          {profile}
          isApplied={applied?.id === profile.id}
          isEditing={editor?.mode === "rename" && editor.id === profile.id}
          onApply={() => applyAppearanceProfile(profile.id)}
          onRename={() => (editor = { mode: "rename", id: profile.id })}
          onDelete={() => deleteAppearanceProfile(profile.id)}
          onSubmitName={(name) => {
            renameAppearanceProfile(profile.id, name);
            editor = null;
          }}
          onCancelEdit={() => (editor = null)}
        />
      {/each}
      {#if editor?.mode === "new"}
        <div
          class="flex items-center w-full p-2 rounded-md border border-dashed border-brs2 bg-bgs2"
        >
          <AppearanceProfileNameEditor
            onSubmit={(name) => {
              saveAppearanceProfileAsNew(name);
              editor = null;
            }}
            onCancel={() => (editor = null)}
          />
        </div>
      {:else}
        <button
          type="button"
          class="flex items-center justify-center gap-2 w-full h-12 rounded-md border border-dashed border-brs3 text-b2 text-fgs2 transition-colors hover:bg-bgs2 hover:border-brs2 hover:text-fgs1"
          data-testid="appearance-profile-save-new"
          onclick={() => (editor = { mode: "new" })}
        >
          <Icon icon="plus" size={Size.sm} />
          New profile
        </button>
      {/if}
    </div>

    {#if applied && isModified && editor?.mode !== "new"}
      <div
        class="flex flex-col gap-3 w-full p-3 rounded-md border border-brs3 bg-bgs2"
        data-testid="appearance-profile-modified"
        role="status"
      >
        <span class="text-b2 text-fgs2"
          >You changed <b class="text-fgs1">{applied.name}</b>.</span
        >
        <div class="flex flex-wrap gap-2">
          {#if !applied.isBuiltIn}
            <Button
              label={`Update '${applied.name}'`}
              size={Size.sm}
              testId="appearance-profile-update"
              onclick={() => updateAppearanceProfile(applied.id)}
            />
          {/if}
          <Button
            label="Save as new"
            size={Size.sm}
            style={ButtonStyle.OUTLINED}
            testId="appearance-profile-banner-save-new"
            onclick={() => (editor = { mode: "new" })}
          />
          <Button
            label="Discard"
            size={Size.sm}
            style={ButtonStyle.PLAIN}
            testId="appearance-profile-discard"
            onclick={() => applyAppearanceProfile(applied.id)}
          />
        </div>
      </div>
    {/if}
  </div>
</FormControlLabelWrapper>
