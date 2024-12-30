<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import { onMount } from "svelte";
  import {
    frameEmailFromParts,
    isValidString
  } from "$lib/shared/utils/text.utils";
  import {
    UserDataMode,
    type EmailParts
  } from "$lib/client/types/account.type";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import ProfilePicture from "./ProfilePicture.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { userPreferences } from "../userPreferences.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { toasts } from "$lib/client/stores/notification.store";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { isRecordId } from "../../flux/resourceStores/resource.utils";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import type { IRecordId } from "$lib/client/types/data.type";
  let name = "";
  let emailParts: EmailParts | undefined = undefined;
  let isEditing = false;
  let isSaveInProgress = false;
  let profilePicture: IRecordId | undefined = $userPreferences.profilePicture;
  onMount(() => {
    const unsubscribeAccount = account.subscribe((value) => {
      if (value.dataMode === UserDataMode.CLOUD) {
        name = $userPreferences.name || value.userInfo?.nickName || "";
        emailParts = value.userInfo?.emailParts || undefined;
      }
    });
    const unsubscribeUserPreferences = userPreferences.subscribe((value) => {
      name = value.name || $account.userInfo?.nickName || "";
    });
    return () => {
      unsubscribeAccount();
      unsubscribeUserPreferences();
    };
  });
  function onSave() {
    userPreferences.updateUserProfile({ name, profilePicture });
    isEditing = false;
  }

  async function handleDrop(
    all: File[],
    valid: File[],
    errors: { file: File; type: string }[]
  ) {
    try {
      if (errors && errors.length > 0) {
        toasts.error("Something went wrong");
        return;
      }
      if (all.length === 1) {
        isSaveInProgress = true;
        let file = all[0];
        const response = await account.uploadFileV2(
          file.type,
          file.name,
          new Blob([file], { type: file.type })
        );
        if (
          isValidArrayWithData(response) &&
          isRecordId(response[0].id, Resource.file)
        ) {
          profilePicture = response[0].id;
        }
      } else if (all.length > 1) {
        toasts.error("Multiple files are not supported");
      }
    } catch (e) {
      toasts.error("Something went wrong");
    } finally {
      isSaveInProgress = false;
    }
  }
</script>

<div class="flex flex-col w-full h-full gap-12 items-start overflow-y-auto">
  <div
    class="flex flex-col gap-1 w-full justify-center rounded-md bg-bgs2 p-4 text-left"
  >
    <div>Hi {$userPreferences.name ?? $account.userInfo?.nickName ?? ""}!</div>
    <div class="flex flex-col gap-2 text-fgs3 text-b2">
      Thanks for being one of the early users of our app! 🥳
      <div>
        We are working on stability improvements and releasing updates almost
        everyday. Please support us as we build the best possible digital memory
        tool together!
      </div>
      <div>
        To maintain our commitment to privacy and ensure long-term
        sustainability, we will be rolling out paid cloud sync plan soon. We
        promise to keep it as low as possible ({`<`} $10 per month). As an early
        member, you will receive a 50% discount on cloud sync plan for your first
        year after your trial ends.
      </div>
    </div>
    <div class="text-fgs3 text-b3 mt-4">-Team Memotron</div>
  </div>
  <div class="flex mo:flex-col gap-4 w-full">
    <div
      class="flex flex-col items-center justify-center bg-bgs2 bg-opacity-50 rounded-md gap-4 w-1/3 mo:w-full p-4"
    >
      <div
        class={cn("flex w-full justify-center items-center")}
        use:fileDrop={{
          accept: ".jpg,.png,.jpeg,.svg",
          multiple: false,
          disabled: !isEditing,
          onDrop: handleDrop
        }}
      >
        <ProfilePicture
          context="account-settings"
          {isEditing}
          isLoading={isSaveInProgress}
          fileId={profilePicture}
        />
      </div>
      <div class="flex flex-col min-h-12 items-center gap-1 w-full">
        {#if isEditing}
          <TextInput bind:value={name} />
        {:else}
          <div class="text-b2 text-fgs3">
            {isValidString(name) ? name : "Unknown"}
          </div>
        {/if}
      </div>
      <div class="self-center flex min-h-8 gap-2 items-center">
        {#if !isEditing}
          <Button
            icon="ph:pencil-simple"
            size={Size.sm}
            isPreventMinWidth={true}
            label="Edit"
            on:click={() => {
              isEditing = true;
            }}
          />
        {:else}
          <Button
            icon="ph:check-bold"
            size={Size.sm}
            type={ButtonVariant.PRIMARY}
            style={ButtonStyle.OUTLINED}
            tooltip="Save"
            on:click={onSave}
          />
          <Button
            icon="ph:x-bold"
            size={Size.sm}
            style={ButtonStyle.OUTLINED}
            tooltip="Cancel"
            on:click={() => {
              isEditing = false;
              profilePicture = $userPreferences.profilePicture;
              name = $userPreferences.name;
            }}
          />
        {/if}
      </div>
    </div>
    <div class="flex flex-col items-start gap-4 flex-grow py-4">
      <Text content="Account Details" style={TextStyle.PANEL_HEADING} />
      <div class="flex flex-col gap-4 w-full items-start">
        <div class="flex flex-col gap-1 w-full items-start">
          <div class="text-b2 text-fgs3">Sign in method</div>
          <div class="flex items-center gap-2">
            {#if emailParts && emailParts.emailDomain.includes("gmail.com")}
              <Icon icon="google" />
              Google
            {:else if emailParts && emailParts.emailDomain.includes("apple.com")}
              <Icon icon="apple" />
              Apple
            {:else}
              Unknown
            {/if}
            {#if emailParts}
              - {frameEmailFromParts(emailParts)}
            {/if}
          </div>
        </div>
        <div class="flex flex-col gap-1 w-full items-start">
          <div class="text-b2 text-fgs3">Plan</div>
          <div class="">Complimentary cloud sync trial 🎉</div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex justify-center w-full gap-4">
    <Button
      icon="ph:sign-out-light"
      label="Sign out"
      on:click={async () => {
        await account.signOut();
      }}
    />
    <Button
      icon="ph:trash-light"
      label="Delete account"
      type={ButtonVariant.DANGER}
      on:click={async () => {
        await account.delete();
      }}
    />
  </div>
  <ScrollViewBottomSpacer />
</div>
