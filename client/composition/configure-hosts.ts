import { configureSessionRecovery } from "@nucleum/client/runtime/account/session-recovery-host";
import { recoverInvalidAccountSession } from "@nucleum/surfaces/account/session-recovery";
import { goto } from "@nucleum/client/runtime/navigation/navigation-request";
import { navigation } from "@nucleum/shell/navigation/navigation";
import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import { actionRunner } from "@nucleum/surfaces/commands/action-runner";
import { configureCommandHost } from "@nucleum/shared-state/commands/command-host";
import { configureProductResourceTables } from "@nucleum/shared-state/product/product-resources";
import { configureActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
import ComponentResolver from "@nucleum/composition/ComponentResolver.svelte";
import AppLoadingView from "@nucleum/composition/AppLoadingView.svelte";
import SubAtomLogo from "@nucleum/composition/SubAtomLogo.svelte";
import { configureProductPresentation } from "@nucleum/shared-state/product/product-presentation-host";
import { get } from "svelte/store";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
import { appEvents } from "@nucleum/shared-state/events/app-events.store";
import { tabs } from "@nucleum/shell/topNav/tabs/tabs.store";
import { AccessMode } from "@nucleum/datafn/resource.type";
import {
  determineResourceType,
  resolveProductResources
} from "@nucleum/datafn/resource.utils";
import { Action } from "@nucleum/client/config/action.enum";
import { configureOverlayHost } from "@nucleum/shell/overlays/modal.store";
import { configureRecordRenderer } from "@nucleum/shared-state/resources/record-renderer";
import { configureShortcutHost } from "@nucleum/shared-state/shortcuts/shortcut-host";
import { configureRecentsHost } from "@nucleum/shared-state/resources/recent-host";
import { configureResourcePanelHost } from "@nucleum/shared-state/resources/resource-panel-host";
import { configureResourceActionHost } from "@nucleum/shared-state/resources/resource-action-host";
import { resolveProductConfig } from "@nucleum/products/product.config";
import { configureProductConfigHost } from "@nucleum/shared-state/product/product-config-host";
import { configureSurfaceProductConfig } from "@nucleum/shared-state/product/surface-config-host";
import { configurePersistenceLogger } from "@nucleum/persistence/logging-host";
import { shortcutsConfig } from "./shortcuts.config";
import { copyResourceLinkToClipboard } from "@nucleum/shell/navigation/resource-link.utils";
import Records from "@nucleum/surfaces/library/records/Records.svelte";
import { configureElementActionHost } from "@21n/ui/hosts/action-host";
import { configureElementShortcutHost } from "@21n/ui/hosts/shortcut-host";
import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
import FileView from "@21n/ui/compositions/files/FileView.svelte";
import { configureElementFileHost } from "@21n/ui/hosts/file-host";
import { configureElementSearchHost } from "@21n/ui/hosts/search-host";
import { fileStore } from "@nucleum/shared-state/files/file.store";
import {
  configureElementAssetPath,
  configureElementHaptic,
  configureElementLogger,
  syncElementPlatform
} from "@21n/ui/environment/element-environment.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { haptic } from "@nucleum/client/runtime/embed/embed.utils";
import { assetPath } from "@nucleum/static";
import context from "@nucleum/client/runtime/context.store";

let mountedOwners = 0;
let disposePlatform: (() => void) | undefined;

/** Installs application-lifetime bindings and shares one platform subscription across mounted roots. */
export function installApplicationHosts() {
  if (mountedOwners === 0) {
    configureOverlayHost({
      onDismiss: (action) => appEvents.nav(action),
      openFullscreen: (path) =>
        navigation.toggleSearchParam({
          [AccessMode.FULL]: path,
          [AccessMode.POP]: null
        }),
      closeFullscreen: () => navigation.toggleSearchParam([AccessMode.FULL]),
      resolvePlayer: (path) =>
        appStore.resolveComponentFromPath(path)?.associatedPlayer
    });

    configureShortcutHost({
      defaults: shortcutsConfig,
      configurableActions: () => resolveProductConfig().configurableShortcuts
    });

    configureRecordRenderer(Records);

    configureRecentsHost({
      resources: () => resolveProductResources(get(appStore).product)
    });

    configureResourcePanelHost({
      readPanel: (id, url) => {
        return url.searchParams.get(
          navigation.resolveRecordSpecificSearchParam(id, AppSearchParam.PANEL)
        );
      },
      writePanel: (id, panel) =>
        navigation.toggleSearchParamRecordSpecific(id, {
          [AppSearchParam.PANEL]: panel
        }),
      close: (id) => navigation.closeResource({ id }),
      goBack: () => navigation.goBack(),
      maximize: (mode, id) => navigation.toggleFullScreen(mode, id)
    });

    configureResourceActionHost({
      copyLink: copyResourceLinkToClipboard,
      open: (id, mode, options) => navigation.openResource(id, mode, options),
      close: (options) => navigation.closeResource(options),
      maximize: (mode, id) => navigation.toggleFullScreen(mode, id),
      openTab: (id) => navigation.openTab(id),
      removeTab: (id) => tabs.remove(id),
      requestLink: (options) =>
        requireCommandHost().runAction(Action.BULK_LINK, {
          componentParams: options
        }),
      afterNodeMutation: async (action, ids) => {
        const lifecycle =
          await import("@nucleum/features/memory/node/node.store");
        if (action === "archive") return lifecycle.onNodeArchive(ids);
        if (action === "unarchive") return lifecycle.onNodeUnarchive(ids);
        return lifecycle.onNodeTrash(ids);
      }
    });

    configureActionRenderer(ComponentResolver);
    configureProductPresentation({
      logo: SubAtomLogo,
      loadingView: AppLoadingView
    });
    configureProductConfigHost(resolveProductConfig());
    configureSurfaceProductConfig(resolveProductConfig);
    configureElementActionHost({
      navigate: goto,
      openLink: (href) => navigation.openLink(href),
      renderer: ComponentResolver,
      runAction: (action, params) =>
        requireCommandHost().runAction(action, params)
    });
    configureElementSearchHost({
      onSelected: (item) => {
        if (typeof item?.id !== "string") return;
        appStore.addToRecents({
          record: {
            ...item,
            bodySearch: undefined,
            labelSearch: undefined
          },
          type: determineResourceType(item.id),
          timestamp: new Date()
        });
      }
    });
    configureElementShortcutHost({
      resolve: (action) => keyboardShortcuts.resolveShortcutForAction(action)
    });
    configureElementFileHost({
      renderer: FileView,
      resolve: (file, options) => fileStore.refresh(file as any, options)
    });
    configureElementLogger(logger);
    configurePersistenceLogger(logger);
    configureElementHaptic(haptic);
    configureElementAssetPath(assetPath);

    configureProductResourceTables(
      (product) => resolveProductConfig(product).resources.table
    );

    configureCommandHost(actionRunner);

    configureSessionRecovery(recoverInvalidAccountSession);

    disposePlatform = context.subscribe(syncElementPlatform);
  }
  mountedOwners++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mountedOwners--;
    if (mountedOwners === 0) {
      disposePlatform?.();
      disposePlatform = undefined;
    }
  };
}
