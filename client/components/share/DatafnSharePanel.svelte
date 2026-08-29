<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import CopyableText from "@21n/elements/text/CopyableText.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { Size } from "@21n/types/size.enum";
  import { ButtonVariant } from "@21n/types/button.type";
  import { InputStyle } from "@21n/types/input.type";
  import {
    OptionSelectorStyle,
    type ISelectValue
  } from "@21n/types/select.type";
  import { toasts } from "@21n/stores/notification.store";
  import {
    createDatafnPublicLink,
    getDatafnPermissions,
    resolveDatafnUserPrincipal,
    revokeDatafnPublicLink,
    shareDatafnRecord,
    shareDatafnResourceScope,
    unshareDatafnRecord,
    unshareDatafnResourceScope,
    type DatafnPermissionGrant,
    type DatafnShareLevel,
    type DatafnShareScope
  } from "@21n/stores/datafn-sharing.store";

  let {
    resource,
    id = undefined
  }: {
    resource: string;
    id?: string | undefined;
  } = $props();

  let principalInput = $state("");
  let level = $state<ISelectValue>("viewer");
  let scope = $state<ISelectValue>(id ? "record" : "resource");
  let permissions = $state<DatafnPermissionGrant[]>([]);
  let publicLinkToken = $state("");
  let isLoading = $state(false);
  let isPublicLinkLoading = $state(false);
  let errorMessage = $state("");

  const levelOptions = [
    { label: "View", value: "viewer" },
    { label: "Edit", value: "editor" },
    { label: "Own", value: "owner" }
  ];
  const scopeOptions = $derived([
    ...(id ? [{ label: "Record", value: "record" }] : []),
    { label: "Resource", value: "resource" }
  ]);
  const selectedLevel = $derived(level as DatafnShareLevel);
  const selectedScope = $derived(scope as DatafnShareScope);
  const isRecordScope = $derived(selectedScope === "record");
  const canUseRecordScope = $derived(!isRecordScope || Boolean(id));

  $effect(() => {
    void loadPermissions();
  });

  async function loadPermissions() {
    if (!id) {
      permissions = [];
      return;
    }
    try {
      permissions = await getDatafnPermissions({ resource, id });
    } catch (error) {
      errorMessage = resolveErrorMessage(error);
    }
  }

  async function shareWithUser() {
    if (!canUseRecordScope) return;
    isLoading = true;
    errorMessage = "";
    try {
      const principalId = resolveDatafnUserPrincipal(principalInput);
      permissions =
        isRecordScope && id
          ? await shareDatafnRecord({
              resource,
              id,
              principalId,
              level: selectedLevel
            })
          : await shareDatafnResourceScope({
              resource,
              principalId,
              level: selectedLevel,
              permissionsRecordId: id
            });
      principalInput = "";
      toasts.success("Permission updated");
    } catch (error) {
      errorMessage = resolveErrorMessage(error);
      toasts.error(errorMessage);
    } finally {
      isLoading = false;
    }
  }

  async function createPublicLink() {
    if (!canUseRecordScope) return;
    isPublicLinkLoading = true;
    errorMessage = "";
    try {
      const link = await createDatafnPublicLink({
        resource,
        recordId: isRecordScope ? id : null,
        scope: selectedScope,
        level: selectedLevel
      });
      publicLinkToken = link.token;
      permissions = id ? await getDatafnPermissions({ resource, id }) : [];
      toasts.success("Public link created");
    } catch (error) {
      errorMessage = resolveErrorMessage(error);
      toasts.error(errorMessage);
    } finally {
      isPublicLinkLoading = false;
    }
  }

  async function revokePermission(permission: DatafnPermissionGrant) {
    if (!canUseRecordScope) return;
    isLoading = true;
    errorMessage = "";
    try {
      if (permission.principalId.startsWith("public_link:")) {
        await revokeDatafnPublicLink({
          id: permission.principalId.slice("public_link:".length)
        });
      }
      permissions =
        permission.grantKind === "resource"
          ? await unshareDatafnResourceScope({
              resource,
              principalId: permission.principalId,
              permissionsRecordId: id
            })
          : id
            ? await unshareDatafnRecord({
                resource,
                id,
                principalId: permission.principalId
              })
            : permissions;
      toasts.success("Permission revoked");
    } catch (error) {
      errorMessage = resolveErrorMessage(error);
      toasts.error(errorMessage);
    } finally {
      isLoading = false;
    }
  }

  function resolveErrorMessage(error: unknown) {
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
    return "Sharing failed";
  }
</script>

<div class="flex flex-col gap-5 p-6 min-w-[26rem] max-w-[36rem]">
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-3">
      <OptionSelector
        bind:selected={level}
        options={levelOptions}
        size={Size.sm}
        style={OptionSelectorStyle.TRAIN}
      />
      <OptionSelector
        bind:selected={scope}
        options={scopeOptions}
        size={Size.sm}
        style={OptionSelectorStyle.TRAIN}
      />
    </div>
    <div class="flex flex-row gap-2 items-center">
      <TextInput
        bind:value={principalInput}
        placeholder="user id or email"
        style={InputStyle.BORDERED}
        size={Size.sm}
        isDisabled={isLoading}
      />
      <Button
        label="Share"
        icon="share"
        size={Size.sm}
        variant={ButtonVariant.PRIMARY}
        {isLoading}
        isDisabled={!principalInput.trim() || !canUseRecordScope}
        onclick={shareWithUser}
      />
    </div>
    <Button
      label="Create public link"
      icon="link"
      size={Size.sm}
      isLoading={isPublicLinkLoading}
      isDisabled={!canUseRecordScope}
      onclick={createPublicLink}
    />
  </div>

  {#if publicLinkToken}
    <CopyableText parentBackgroundIndex={1} text={publicLinkToken} />
  {/if}

  {#if errorMessage}
    <p class="text-b3 text-ars1">{errorMessage}</p>
  {/if}

  <div class="flex flex-col gap-2">
    {#each permissions as permission}
      <div
        class="flex flex-row items-center justify-between gap-3 border border-brs2 rounded-md px-3 py-2"
      >
        <div class="flex flex-col min-w-0">
          <span class="text-b3 truncate">{permission.principalId}</span>
          <span class="text-b4 text-fgs2"
            >{permission.level} / {permission.grantKind}</span
          >
        </div>
        <Button
          icon="trash"
          tooltip="Revoke"
          size={Size.sm}
          variant={ButtonVariant.DANGER}
          {isLoading}
          onclick={() => revokePermission(permission)}
        />
      </div>
    {:else}
      <p class="text-b3 text-fgs2">No shared permissions yet</p>
    {/each}
  </div>
</div>
