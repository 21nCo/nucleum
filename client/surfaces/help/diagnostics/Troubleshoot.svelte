<script lang="ts">
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { ButtonVariant } from "@21n/ui/elements/button/button.type";
  import { copyToClipboard } from "@21n/shared-utils/clipboard";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { onMount } from "svelte";
  import {
    collectDiagnosticSections,
    formatDiagnosticReport,
    resolveStorageEstimate
  } from "@nucleum/surfaces/help/diagnostics/diagnostic-report";

  let isCopyInProgress = $state(false);
  let storageEstimate: string | undefined = $state();

  onMount(() => {
    let isActive = true;
    void resolveStorageEstimate().then((estimate) => {
      if (isActive) storageEstimate = estimate;
    });
    return () => {
      isActive = false;
    };
  });

  async function copyDiagnostics() {
    isCopyInProgress = true;
    try {
      // Build the report and start the clipboard write synchronously in the
      // click handler: WebKit drops user activation across an await.
      const report = formatDiagnosticReport(
        collectDiagnosticSections(storageEstimate),
        new Date()
      );
      await copyToClipboard(report);
      toasts.success("Diagnostic information copied to the clipboard");
    } catch (error) {
      logger.error({ at: "Troubleshoot.copyDiagnostics", error });
      toasts.error("Unable to copy diagnostic information");
    } finally {
      isCopyInProgress = false;
    }
  }

  function sendDiagnostics() {}
</script>

<div class="flex flex-col gap-6 w-full max-w-xl" data-testid="troubleshoot">
  <div class="flex items-center justify-between gap-6">
    <div class="flex flex-col gap-1">
      <div class="text-b1 text-fgs1">Copy diagnostic information</div>
      <div class="text-b3 text-fgs3">
        App version, device, sync status and appearance. Paste it into a support
        conversation. It does not include your account details or content.
      </div>
    </div>
    <Button
      label="Copy"
      icon="copy"
      type={ButtonVariant.SECONDARY}
      isLoading={isCopyInProgress}
      onclick={copyDiagnostics}
      testId="copy-diagnostic-information"
    />
  </div>
  <div class="flex items-center justify-between gap-6">
    <div class="flex flex-col gap-1">
      <div class="text-b1 text-fgs1">Send diagnostic information</div>
      <div class="text-b3 text-fgs3">
        Sends the same information to the 21n team.
      </div>
    </div>
    <Button
      label="Send"
      icon="share"
      type={ButtonVariant.SECONDARY}
      onclick={sendDiagnostics}
      testId="send-diagnostic-information"
    />
  </div>
  <div class="flex items-center justify-between gap-6">
    <div class="flex flex-col gap-1">
      <div class="text-b1 text-fgs1">Diagnostics</div>
      <div class="text-b3 text-fgs3">
        Detailed device, storage and sync state, local data consoles and logging
        controls.
      </div>
    </div>
    <Button
      label="Open"
      icon="chevright"
      type={ButtonVariant.SECONDARY}
      onclick={() => requireCommandHost().runAction("diagnostics")}
      testId="open-diagnostics"
    />
  </div>
</div>
