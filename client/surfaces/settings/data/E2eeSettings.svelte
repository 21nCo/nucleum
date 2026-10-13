<script lang="ts">
  import Button from "@21n/ui/elements/button/Button.svelte";
  import TextInput from "@21n/ui/elements/input/TextInput.svelte";
  import InlineInfoBanner from "@21n/ui/elements/text/InlineInfoBanner.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import {
    changeNucleumDatafnE2eePassword,
    datafnRuntime,
    disableNucleumDatafnE2ee,
    enableNucleumDatafnE2ee
  } from "@nucleum/datafn/datafn.store";
  import {
    datafnE2eeState,
    validateDatafnE2eePassword
  } from "@nucleum/datafn/datafnE2ee.store";
  import {
    confirmationNotification,
    toasts
  } from "@nucleum/shared-state/notifications/notification.store";
  import { ButtonVariant } from "@21n/ui/elements/button/button.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { InfoTextType } from "@21n/ui/elements/text/info.type";
  import { logger } from "@nucleum/client/runtime/logging/logger";

  let isE2eeInProgress = $state(false);
  let e2eePasswordMode = $state<"enable" | "change" | null>(null);
  let e2eePasswordValue = $state("");
  let e2eePasswordConfirmation = $state("");
  let e2eePasswordError = $state<string | undefined>(undefined);
  const canManageE2ee = $derived($datafnRuntime?.mode === "sync");

  function openE2eePasswordForm(mode: "enable" | "change") {
    e2eePasswordMode = mode;
    e2eePasswordValue = "";
    e2eePasswordConfirmation = "";
    e2eePasswordError = undefined;
  }

  function resetE2eePasswordForm() {
    e2eePasswordMode = null;
    e2eePasswordValue = "";
    e2eePasswordConfirmation = "";
    e2eePasswordError = undefined;
  }

  function validateE2eePasswordForm() {
    if (!e2eePasswordValue || !e2eePasswordConfirmation) {
      e2eePasswordError = "Please fill both password fields.";
      return false;
    }
    if (e2eePasswordValue !== e2eePasswordConfirmation) {
      e2eePasswordError = "Passwords do not match.";
      return false;
    }
    const validation = validateDatafnE2eePassword(e2eePasswordValue);
    if (!validation.ok) {
      e2eePasswordError = validation.message;
      return false;
    }
    e2eePasswordError = undefined;
    return true;
  }

  async function handleSubmitE2eePassword() {
    if (!e2eePasswordMode || !validateE2eePasswordForm()) return;
    const password = e2eePasswordValue;
    if (e2eePasswordMode === "enable") {
      window.alert(
        "A local copy of your data will be kept on this device and will consume device storage."
      );
    }
    isE2eeInProgress = true;
    try {
      if (e2eePasswordMode === "enable") {
        await enableNucleumDatafnE2ee(password);
        toasts.success("End-to-end encryption turned on");
      } else {
        await changeNucleumDatafnE2eePassword(password);
        toasts.success("E2EE password changed");
      }
      resetE2eePasswordForm();
    } catch (error) {
      logger.error({ at: "handleSubmitE2eePassword", error });
      toasts.error(
        e2eePasswordMode === "enable"
          ? "Unable to turn on end-to-end encryption"
          : "Unable to change E2EE password"
      );
    } finally {
      isE2eeInProgress = false;
    }
  }

  function handleDisableE2ee() {
    confirmationNotification.notify({
      title: "Turn off E2EE",
      message:
        "This will replace encrypted cloud data with the decrypted local copy from this device.",
      confirmAction: {
        label: "Turn off",
        icon: "lock",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          isE2eeInProgress = true;
          try {
            await disableNucleumDatafnE2ee();
            toasts.success("End-to-end encryption turned off");
            return true;
          } catch (error) {
            logger.error({ at: "handleDisableE2ee", error });
            toasts.error("Unable to turn off end-to-end encryption");
            return false;
          } finally {
            isE2eeInProgress = false;
          }
        }
      }
    });
  }
</script>

<section class="flex flex-col gap-4">
  <Text content="End-to-end encryption" style={TextStyle.SECTION_HEADING} />
  <InlineInfoBanner
    type={$datafnE2eeState.enabled ? InfoTextType.INFO : InfoTextType.WARNING}
    size={Size.sm}
    content={$datafnE2eeState.enabled
      ? "E2EE is on. Data queries and search use the decrypted local clone on this device."
      : "E2EE encrypts cloud data before upload. Relationship and system fields stay readable for sync."}
  />
  <div class="flex flex-wrap items-center gap-4">
    {#if $datafnE2eeState.enabled}
      <Button
        label="Change password"
        icon="lock"
        onclick={() => openE2eePasswordForm("change")}
        isLoading={isE2eeInProgress}
        isDisabled={!canManageE2ee || !$datafnE2eeState.unlocked}
      />
      <Button
        label="Turn off E2EE"
        icon="lock"
        type={ButtonVariant.DANGER}
        onclick={handleDisableE2ee}
        isLoading={isE2eeInProgress}
        isDisabled={!canManageE2ee || !$datafnE2eeState.unlocked}
      />
    {:else}
      <Button
        label="Turn on E2EE"
        icon="lock"
        type={ButtonVariant.PRIMARY}
        onclick={() => openE2eePasswordForm("enable")}
        isLoading={isE2eeInProgress}
        isDisabled={!canManageE2ee}
      />
    {/if}
  </div>
  {#if e2eePasswordMode}
    <div class="flex flex-col gap-3 w-full max-w-md bg-bgs2 rounded-md p-3">
      <TextInput
        bind:value={e2eePasswordValue}
        type="password"
        label="E2EE password"
        placeholder="********"
        onInput={() => {
          e2eePasswordError = undefined;
        }}
      />
      <TextInput
        bind:value={e2eePasswordConfirmation}
        type="password"
        label="Confirm E2EE password"
        placeholder="********"
        onInput={() => {
          e2eePasswordError = undefined;
        }}
        onEnter={handleSubmitE2eePassword}
      />
      {#if e2eePasswordError}
        <div class="text-ars1 text-b3">{e2eePasswordError}</div>
      {/if}
      <div class="flex gap-2">
        <Button
          label={e2eePasswordMode === "enable"
            ? "Turn on E2EE"
            : "Change password"}
          size={Size.sm}
          type={ButtonVariant.PRIMARY}
          isLoading={isE2eeInProgress}
          isDisabled={isE2eeInProgress}
          onclick={handleSubmitE2eePassword}
        />
        <Button
          label="Cancel"
          size={Size.sm}
          isDisabled={isE2eeInProgress}
          onclick={resetE2eePasswordForm}
        />
      </div>
    </div>
  {/if}
</section>
