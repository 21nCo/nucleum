<script lang="ts">
  import { onMount, tick } from "svelte";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import {
    ButtonStyle,
    ButtonVariant
  } from "@21n/ui/elements/button/button.type";
  import TextInput from "@21n/ui/elements/input/TextInput.svelte";
  import OptionSelector from "@21n/ui/elements/select/OptionSelector.svelte";
  import { OptionSelectorStyle } from "@21n/ui/elements/select/select.type";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { copyToClipboard } from "@21n/shared-utils/clipboard";
  import { parseAndFormatDate } from "@21n/shared-utils/datetime/date-formatting";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import {
    interfaceApps,
    interfaceContract,
    type InterfaceApp
  } from "@nucleum/schema/interfaces";
  import {
    accessTokenExpiryDays,
    createAccessToken,
    isAccessTokenExpired,
    listAccessTokens,
    revokeAccessToken,
    type AccessToken,
    type AccessTokenAccess,
    type AccessTokenExpiryDays,
    type CreatedAccessToken
  } from "@nucleum/client/runtime/account/access-tokens";

  const appLabels: Record<InterfaceApp, string> = {
    memotron: "Memotron",
    pointron: "Pointron",
    nucleum: "Nucleum"
  };
  const accessLabels: Record<AccessTokenAccess, string> = {
    read: "Read",
    "read-write": "Read and write"
  };
  const appOptions = interfaceApps.map((app) => ({
    value: app,
    label: appLabels[app]
  }));
  const accessOptions = (["read", "read-write"] as const).map((access) => ({
    value: access,
    label: accessLabels[access]
  }));
  const expiryOptions = accessTokenExpiryDays.map((days) => ({
    value: days,
    label: days === 365 ? "1 year" : `${days} days`
  }));

  let tokens = $state<AccessToken[]>([]);
  let isLoading = $state(true);
  let loadError = $state<
    { message: string; isUnsupported: boolean } | undefined
  >(undefined);
  let isFormVisible = $state(false);
  let name = $state("");
  let app = $state<InterfaceApp>(defaultApp());
  let access = $state<AccessTokenAccess>("read");
  let expiresInDays = $state<AccessTokenExpiryDays>(30);
  let formError = $state<string | undefined>(undefined);
  let isCreating = $state(false);
  let created = $state<(CreatedAccessToken & { name: string }) | undefined>(
    undefined
  );
  let confirmRevokeId = $state<string | undefined>(undefined);
  let revokingId = $state<string | undefined>(undefined);
  let listGeneration = 0;
  let sectionElement = $state<HTMLElement | undefined>(undefined);
  let nameInput = $state<{ focus: () => Promise<void> } | undefined>(undefined);

  onMount(() => {
    void refresh();
  });

  function defaultApp(): InterfaceApp {
    return (
      interfaceApps.find(
        (candidate) =>
          candidate !== "nucleum" &&
          interfaceContract[candidate].product === $appStore.product
      ) ?? "nucleum"
    );
  }

  /**
   * Reloads the list. Only the latest request writes its result, so an
   * earlier list that resolves late cannot bring back a revoked token or
   * hide a created one.
   */
  async function refresh() {
    const generation = ++listGeneration;
    isLoading = true;
    const result = await listAccessTokens();
    if (generation !== listGeneration) return;
    if (result.ok) {
      tokens = result.data;
      loadError = undefined;
    } else {
      loadError = {
        message: result.message,
        isUnsupported: result.kind === "unsupported"
      };
    }
    isLoading = false;
  }

  function openForm() {
    name = "";
    app = defaultApp();
    access = "read";
    expiresInDays = 30;
    formError = undefined;
    isFormVisible = true;
    void focusNameInput();
  }

  function closeForm() {
    isFormVisible = false;
    formError = undefined;
    void focusSectionFallback();
  }

  async function focusNameInput() {
    await tick();
    await nameInput?.focus();
  }

  async function focusInSection(selector: string) {
    await tick();
    const target = sectionElement?.querySelector<HTMLElement>(selector);
    if (!target) return false;
    target.focus();
    return true;
  }

  /**
   * Focus target when the focused control goes away and no nearer control
   * takes its place: Create, else Retry, else the open form, else the heading.
   */
  async function focusSectionFallback() {
    if (await focusInSection('[data-testid="access-token-create"]')) return;
    if (await focusInSection('[data-testid="access-token-retry"]')) return;
    if (isFormVisible && nameInput) {
      await nameInput.focus();
      return;
    }
    await focusInSection("#access-tokens-heading");
  }

  /** Puts focus back in the section if a list reload removed its target. */
  async function restoreFocusIfLost() {
    await tick();
    const active = document.activeElement;
    if (!active || active === document.body) await focusSectionFallback();
  }

  async function handleRetry() {
    await refresh();
    await restoreFocusIfLost();
  }

  function dismissCreated() {
    created = undefined;
    void focusSectionFallback();
  }

  async function handleCreate() {
    if (isCreating) return;
    isCreating = true;
    formError = undefined;
    const tokenName = name.trim();
    const result = await createAccessToken({
      name: tokenName,
      app,
      access,
      expiresInDays
    });
    isCreating = false;
    if (!result.ok) {
      formError = result.message;
      await focusNameInput();
      return;
    }
    created = { ...result.data, name: tokenName };
    isFormVisible = false;
    await focusInSection('[data-testid="access-token-copy"]');
    await refresh();
    await restoreFocusIfLost();
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await copyToClipboard(created.secret);
      toasts.success("Access token copied to the clipboard");
    } catch {
      toasts.error("Unable to copy the access token");
    }
  }

  async function handleRevoke(token: AccessToken) {
    if (revokingId) return;
    revokingId = token.id;
    const result = await revokeAccessToken(token.id);
    revokingId = undefined;
    confirmRevokeId = undefined;
    if (!result.ok) {
      toasts.error(result.message);
      await focusRowButton(token.id, "access-token-revoke");
      return;
    }
    if (created?.id === token.id) created = undefined;
    const index = tokens.findIndex((entry) => entry.id === token.id);
    tokens = tokens.filter((entry) => entry.id !== token.id);
    toasts.success(`Revoked ${token.name}`);
    const neighbour = tokens[index] ?? tokens[index - 1];
    if (neighbour) await focusRowButton(neighbour.id, "access-token-revoke");
    else await focusSectionFallback();
    await refresh();
    await restoreFocusIfLost();
  }

  async function focusRowButton(tokenId: string, testId: string) {
    await tick();
    const row = Array.from(
      sectionElement?.querySelectorAll<HTMLElement>("[data-token-id]") ?? []
    ).find((element) => element.dataset.tokenId === tokenId);
    const target = row?.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (target) target.focus();
    else await focusSectionFallback();
  }

  /** Swaps the row to its confirm controls and moves focus to them. */
  function askToRevoke(token: AccessToken) {
    confirmRevokeId = token.id;
    void focusRowButton(token.id, "access-token-revoke-confirm");
  }

  function cancelRevoke(token: AccessToken) {
    confirmRevokeId = undefined;
    void focusRowButton(token.id, "access-token-revoke");
  }

  function describeGrant(token: AccessToken) {
    if (!token.app || !token.access) return "Custom scopes";
    return `${appLabels[token.app]} - ${accessLabels[token.access]}`;
  }

  function describeExpiry(token: AccessToken) {
    if (!token.expiresAt) return "Never expires";
    const date = parseAndFormatDate(token.expiresAt);
    return isAccessTokenExpired(token) ? `Expired ${date}` : `Expires ${date}`;
  }

  function describeLastUse(token: AccessToken) {
    return token.lastUsedAt
      ? `Last used ${parseAndFormatDate(token.lastUsedAt)}`
      : "Never used";
  }
</script>

<section
  class="flex flex-col gap-4 w-full items-start"
  aria-labelledby="access-tokens-heading"
  data-testid="access-tokens"
  bind:this={sectionElement}
>
  <div class="flex items-center justify-between gap-4 w-full">
    <div class="flex flex-col gap-1">
      <div id="access-tokens-heading" tabindex="-1" class="outline-none">
        <Text content="Access tokens" style={TextStyle.PANEL_HEADING} />
      </div>
      <div class="text-b3 text-fgs3">
        Personal access tokens let scripts, the CLI and MCP clients reach one
        app's data on your behalf. Treat them like passwords.
      </div>
    </div>
    {#if !isFormVisible && !loadError}
      <Button
        icon="plus"
        label="Create token"
        size={Size.sm}
        style={ButtonStyle.OUTLINED}
        testId="access-token-create"
        onclick={openForm}
      />
    {/if}
  </div>

  {#if created}
    <div
      class="flex flex-col gap-2 w-full bg-bgs2 rounded-md p-3"
      role="status"
      data-testid="access-token-created"
    >
      <div class="text-b2">
        Copy the token for {created.name} now. You will not be able to see it again.
      </div>
      <div class="flex items-center gap-2 w-full">
        <code
          class="flex-grow min-w-0 break-all rounded bg-bgs3 px-2 py-1 text-b3 select-all"
          data-testid="access-token-secret">{created.secret}</code
        >
        <Button
          icon="copy"
          label="Copy"
          size={Size.sm}
          type={ButtonVariant.SECONDARY}
          testId="access-token-copy"
          onclick={handleCopy}
        />
        <Button
          label="Done"
          size={Size.sm}
          style={ButtonStyle.PLAIN}
          testId="access-token-dismiss"
          onclick={dismissCreated}
        />
      </div>
    </div>
  {/if}

  {#if isFormVisible}
    <div
      class="flex flex-col gap-3 w-full max-w-md bg-bgs2 rounded-md p-3"
      data-testid="access-token-form"
    >
      <TextInput
        bind:this={nameInput}
        bind:value={name}
        label={{ label: "Name", orientation: Orientation.Vertical }}
        placeholder="What is this token for?"
        size={Size.sm}
        onInput={() => {
          formError = undefined;
        }}
        onEnter={handleCreate}
      />
      <OptionSelector
        bind:selected={app}
        options={appOptions}
        labelProps={{ label: "App", orientation: Orientation.Vertical }}
        size={Size.sm}
        style={OptionSelectorStyle.TRAIN}
      />
      <OptionSelector
        bind:selected={access}
        options={accessOptions}
        labelProps={{ label: "Access", orientation: Orientation.Vertical }}
        size={Size.sm}
        style={OptionSelectorStyle.TRAIN}
      />
      <OptionSelector
        bind:selected={expiresInDays}
        options={expiryOptions}
        labelProps={{ label: "Expires in", orientation: Orientation.Vertical }}
        size={Size.sm}
        style={OptionSelectorStyle.TRAIN}
      />
      {#if formError}
        <div class="text-ars1 text-b3" role="alert">{formError}</div>
      {/if}
      <div class="flex gap-2">
        <Button
          label={isCreating ? "Creating..." : "Create"}
          size={Size.sm}
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          isLoading={isCreating}
          isDisabled={isCreating}
          testId="access-token-submit"
          onclick={handleCreate}
        />
        <Button
          label="Cancel"
          size={Size.sm}
          style={ButtonStyle.PLAIN}
          isDisabled={isCreating}
          onclick={closeForm}
        />
      </div>
    </div>
  {/if}

  {#if loadError?.isUnsupported}
    <div class="text-fgs3 text-b3">{loadError.message}</div>
  {:else if loadError}
    <div class="flex items-center gap-2">
      <div class="text-ars1 text-b3" role="alert">{loadError.message}</div>
      <Button
        label={isLoading ? "Retrying..." : "Retry"}
        size={Size.sm}
        style={ButtonStyle.OUTLINED}
        {isLoading}
        isDisabled={isLoading}
        testId="access-token-retry"
        onclick={handleRetry}
      />
    </div>
  {:else if isLoading && tokens.length === 0}
    <div class="text-fgs3 text-b3">Loading access tokens...</div>
  {:else if tokens.length === 0}
    <div class="text-fgs3 text-b3">You have no access tokens.</div>
  {:else}
    <ul class="flex flex-col gap-2 w-full" aria-label="Access tokens">
      {#each tokens as token (token.id)}
        <li
          class="flex items-center justify-between gap-4 w-full rounded-md bg-bgs2 p-3"
          data-testid="access-token-row"
          data-token-id={token.id}
        >
          <div class="flex flex-col gap-1 min-w-0">
            <span class="truncate">{token.name}</span>
            <span class="text-fgs3 text-b3">
              {describeGrant(token)} - {describeExpiry(token)} - {describeLastUse(
                token
              )}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            {#if confirmRevokeId === token.id}
              <span class="text-b3 text-fgs3">Revoke this token?</span>
              <Button
                label="Revoke"
                size={Size.sm}
                type={ButtonVariant.DANGER}
                isLoading={revokingId === token.id}
                isDisabled={revokingId !== undefined}
                testId="access-token-revoke-confirm"
                onclick={() => handleRevoke(token)}
              />
              <Button
                label="Cancel"
                size={Size.sm}
                style={ButtonStyle.PLAIN}
                isDisabled={revokingId !== undefined}
                onclick={() => cancelRevoke(token)}
              />
            {:else}
              <Button
                label="Revoke"
                size={Size.sm}
                style={ButtonStyle.OUTLINED}
                isDisabled={revokingId !== undefined}
                testId="access-token-revoke"
                onclick={() => askToRevoke(token)}
              />
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
