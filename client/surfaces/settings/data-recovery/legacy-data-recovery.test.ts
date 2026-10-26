import { beforeEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import { UserDataMode } from "@nucleum/client/runtime/account/account.type";

const mocks = vi.hoisted(() => ({
  detect: vi.fn(),
  decision: vi.fn(),
  pending: vi.fn(),
  exportBackup: vi.fn(),
  save: vi.fn(),
  completeUpload: vi.fn(),
  importBackup: vi.fn(),
  download: vi.fn(),
  cloneUp: vi.fn(),
  success: vi.fn(),
  isExtension: vi.fn()
}));
vi.mock("@nucleum/client/runtime/account/account.store", () => ({
  default: writable({ dataMode: UserDataMode.CLOUD })
}));
vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: writable({ product: "nucleum" })
}));
vi.mock("@nucleum/client/runtime/context.store", () => ({
  default: writable({ isSheet: false })
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { success: mocks.success }
}));
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { error: vi.fn() }
}));
vi.mock("@21n/shared-utils/browser-environment", () => ({
  isExtensionEnvironment: mocks.isExtension
}));
vi.mock("@nucleum/shared-state/files/file.store", () => ({
  fileStore: { downloadFromBlob: mocks.download }
}));
vi.mock("@nucleum/datafn/datafn.store", () => ({
  nucleumDatafnStatus: writable({ nucleumMode: "sync" }),
  cloneUpAllDatafnData: mocks.cloneUp
}));
vi.mock("@nucleum/persistence/legacy-backup/discovery", () => ({
  detectLegacyLocalData: mocks.detect,
  exportLegacyLocalData: mocks.exportBackup
}));
vi.mock("@nucleum/persistence/legacy-backup/recovery-decisions", () => ({
  getLegacyLocalDataRecoveryDecision: mocks.decision,
  hasPendingLegacyLocalDataCloudUpload: mocks.pending,
  saveLegacyLocalDataRecoveryDecision: mocks.save,
  completeLegacyLocalDataCloudUpload: mocks.completeUpload
}));
vi.mock("@nucleum/persistence/legacy-backup/summary", () => ({
  hasRecoverableLegacyLocalData: () => true,
  resolveLegacyLocalDataRecordCount: () => 3
}));
vi.mock("@nucleum/surfaces/settings/data-recovery/import-legacy-data", () => ({
  importLegacyLocalDataBackup: mocks.importBackup
}));

import { createLegacyDataRecovery } from "./legacy-data-recovery.svelte";
import type { NucleumDatafnRuntime } from "@nucleum/datafn/datafn.store";

describe("legacy recovery startup workflow", () => {
  const backup = {
    databases: [{ name: "legacy" }],
    exportedAt: "2026-09-21T00:00:00Z"
  };
  const create = () => {
    const callbacks = {
      initializeDatabase: vi.fn(
        async () =>
          ({ mode: "local-only", storage: {} }) as NucleumDatafnRuntime
      ),
      completeApplicationStartup: vi.fn(async () => {}),
      startApplication: vi.fn(async () => {}),
      onLoading: vi.fn()
    };
    return { recovery: createLegacyDataRecovery(callbacks), callbacks };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isExtension.mockReturnValue(false);
    mocks.detect.mockResolvedValue({
      isSupported: true,
      databases: [{ name: "legacy" }]
    });
    mocks.decision.mockResolvedValue(undefined);
    mocks.pending.mockResolvedValue(false);
    mocks.exportBackup.mockResolvedValue(backup);
    mocks.importBackup.mockResolvedValue({ resources: 3, joins: 0 });
    mocks.download.mockResolvedValue(true);
    mocks.cloneUp.mockResolvedValue(undefined);
    mocks.save.mockResolvedValue(undefined);
  });

  it("persists an import decision before allowing application startup", async () => {
    const { recovery, callbacks } = create();
    expect(await recovery.prepare()).toBe(true);
    expect(recovery.mode).toBe("required");
    await recovery.importData();
    expect(callbacks.onLoading).toHaveBeenCalledWith({
      message: "Importing old local data...",
      subMessage: "Preparing a local backup first."
    });
    expect(callbacks.initializeDatabase).toHaveBeenCalledWith({
      isOfflinabilityEnabled: true
    });
    expect(mocks.importBackup).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "import_old_data",
        isCloudUploadPending: true
      }),
      backup
    );
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(
      callbacks.completeApplicationStartup.mock.invocationCallOrder[0]
    );
    expect(recovery.mode).toBeNull();
    expect(recovery.isCloudUploadPending).toBe(true);
    await recovery.uploadPendingCloudData();
    expect(mocks.cloneUp).toHaveBeenCalledOnce();
    expect(mocks.completeUpload).toHaveBeenCalledWith("nucleum");
    expect(recovery.isCloudUploadPending).toBe(false);
  });

  it("keeps recovery available after an import failure", async () => {
    mocks.importBackup.mockRejectedValue(new Error("failed import"));
    const { recovery, callbacks } = create();
    await recovery.prepare();
    await recovery.importData();
    expect(recovery.mode).toBe("required");
    expect(recovery.error).toContain("Unable to import");
    expect(callbacks.completeApplicationStartup).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("requires successful backup delivery before saving a skip decision", async () => {
    const { recovery, callbacks } = create();
    await recovery.prepare();
    mocks.download.mockResolvedValue(false);
    await recovery.downloadAndContinue();
    expect(recovery.mode).toBe("required");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(callbacks.startApplication).not.toHaveBeenCalled();
    mocks.download.mockResolvedValue(true);
    await recovery.downloadAndContinue();
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: "download_backup_continue" }),
      backup
    );
    expect(callbacks.startApplication).toHaveBeenCalledOnce();
    expect(mocks.download.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.save.mock.invocationCallOrder[0]
    );
  });

  it("retains pending cloud data after a failed upload for a later retry", async () => {
    mocks.pending.mockResolvedValue(true);
    mocks.decision.mockResolvedValue({ isCloudUploadPending: true });
    const { recovery } = create();
    expect(await recovery.prepare()).toBe(false);
    mocks.cloneUp.mockRejectedValueOnce(new Error("offline"));
    await recovery.uploadPendingCloudData();
    expect(recovery.isCloudUploadPending).toBe(true);
    expect(mocks.completeUpload).not.toHaveBeenCalled();
    await recovery.uploadPendingCloudData();
    expect(recovery.isCloudUploadPending).toBe(false);
    expect(mocks.completeUpload).toHaveBeenCalledOnce();
  });

  it("does not inspect legacy databases in the extension", async () => {
    mocks.isExtension.mockReturnValue(true);
    const { recovery } = create();
    expect(await recovery.prepare()).toBe(false);
    expect(mocks.detect).not.toHaveBeenCalled();
  });
});
