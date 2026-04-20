import type { ProductName, SurfaceKey } from "../../config/product-nav.config";
import { getE2EProductConfigFromProjectName } from "../../config/product-nav.config";
import { E2EContractError } from "./capabilities";

export type ResourceKey =
  | "collection"
  | "goal"
  | "task"
  | "node"
  | "session";

export interface ResourceContract {
  key: ResourceKey;
  browseEnabled: boolean;
  browseSurface: SurfaceKey | null;
  browseLabelPattern: RegExp | null;
  searchTextboxName: RegExp | null;
  recordEnabled: boolean;
  tabbedRecordEnabled: boolean;
  renameEnabled: boolean;
  pinnedBrowserEnabled: boolean;
}

function resolveGoalPattern(projectName: ProductName) {
  const config = getE2EProductConfigFromProjectName(projectName);
  const goalLabel = config.labels.goalResource;
  return new RegExp(`^(${goalLabel}|Goals|Objectives)(\\s+\\d+)?$`, "i");
}

function createBaseContract(
  projectName: ProductName,
  key: ResourceKey
): ResourceContract {
  const config = getE2EProductConfigFromProjectName(projectName);
  switch (key) {
    case "collection":
      return {
        key,
        browseEnabled: config.resources.browse.includes("collection"),
        browseSurface: "library.collections",
        browseLabelPattern: /^(Collections)(\s+\d+)?$/i,
        searchTextboxName: /Search collections/i,
        recordEnabled: config.capabilities.records.collection,
        tabbedRecordEnabled: config.capabilities.records.collectionTabs,
        renameEnabled: config.capabilities.records.collectionRename,
        pinnedBrowserEnabled:
          config.capabilities.ui.pinnedResourceBrowser &&
          config.resources.browse.includes("collection")
      };
    case "goal":
      return {
        key,
        browseEnabled: config.resources.browse.includes("goal"),
        browseSurface: "library.goals",
        browseLabelPattern: resolveGoalPattern(projectName),
        searchTextboxName: /Search goals/i,
        recordEnabled: config.capabilities.records.goal,
        tabbedRecordEnabled: config.capabilities.records.goalTabs,
        renameEnabled: false,
        pinnedBrowserEnabled:
          config.capabilities.ui.pinnedResourceBrowser &&
          config.resources.browse.includes("goal")
      };
    case "task":
      return {
        key,
        browseEnabled: config.resources.browse.includes("task"),
        browseSurface: "library.tasks",
        browseLabelPattern: /^(Tasks)(\s+\d+)?$/i,
        searchTextboxName: /Search tasks/i,
        recordEnabled: config.capabilities.records.task,
        tabbedRecordEnabled: config.capabilities.records.taskTabs,
        renameEnabled: false,
        pinnedBrowserEnabled:
          config.capabilities.ui.pinnedResourceBrowser &&
          config.resources.browse.includes("task")
      };
    case "node":
      return {
        key,
        browseEnabled: config.resources.browse.includes("node"),
        browseSurface: "library.nodes",
        browseLabelPattern: /^(Nodes)(\s+\d+)?$/i,
        searchTextboxName: /Search nodes/i,
        recordEnabled: config.capabilities.records.node,
        tabbedRecordEnabled: config.capabilities.records.nodeTabs,
        renameEnabled: false,
        pinnedBrowserEnabled:
          config.capabilities.ui.pinnedResourceBrowser &&
          config.resources.browse.includes("node")
      };
    case "session":
      return {
        key,
        browseEnabled: config.resources.browse.includes("session"),
        browseSurface: null,
        browseLabelPattern: /^(Sessions)(\s+\d+)?$/i,
        searchTextboxName: /Search sessions/i,
        recordEnabled: config.capabilities.records.session,
        tabbedRecordEnabled: false,
        renameEnabled: false,
        pinnedBrowserEnabled: false
      };
  }
}

export function getResourceContract(
  projectName: string,
  resource: ResourceKey
): ResourceContract {
  return createBaseContract(projectName as ProductName, resource);
}

export function requireResourceBrowseContract(
  projectName: string,
  resource: ResourceKey
): ResourceContract {
  const contract = getResourceContract(projectName, resource);
  if (!contract.browseEnabled || !contract.browseSurface || !contract.browseLabelPattern) {
    throw new E2EContractError(
      "E2E_CFG_002",
      `Browse contract for resource "${resource}" is not enabled for project "${projectName}".`
    );
  }
  return contract;
}

export function requireResourceRecordContract(
  projectName: string,
  resource: ResourceKey
): ResourceContract {
  const contract = getResourceContract(projectName, resource);
  if (!contract.recordEnabled) {
    throw new E2EContractError(
      "E2E_CFG_002",
      `Record contract for resource "${resource}" is not enabled for project "${projectName}".`
    );
  }
  return contract;
}

export function requireResourceTabbedRecordContract(
  projectName: string,
  resource: ResourceKey
): ResourceContract {
  const contract = requireResourceRecordContract(projectName, resource);
  if (!contract.tabbedRecordEnabled) {
    throw new E2EContractError(
      "E2E_CFG_002",
      `Tabbed record contract for resource "${resource}" is not enabled for project "${projectName}".`
    );
  }
  return contract;
}

export function getAllResourceContracts(projectName: string): ResourceContract[] {
  return [
    getResourceContract(projectName, "collection"),
    getResourceContract(projectName, "goal"),
    getResourceContract(projectName, "task"),
    getResourceContract(projectName, "node"),
    getResourceContract(projectName, "session")
  ];
}
