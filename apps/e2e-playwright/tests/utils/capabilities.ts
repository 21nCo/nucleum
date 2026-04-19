import { getE2EProductConfigFromProjectName } from "../../config/product-nav.config";

export class E2EContractError extends Error {
  constructor(
    readonly code:
      | "E2E_CFG_001"
      | "E2E_CFG_002"
      | "E2E_SEL_001"
      | "E2E_SURFACE_001"
      | "E2E_STATE_001"
      | "E2E_ASSERT_001",
    message: string
  ) {
    super(`[${code}] ${message}`);
    this.name = "E2EContractError";
  }
}

function readDotPath(
  value: unknown,
  path: string
): { exists: boolean; value: unknown } {
  return path.split(".").reduce(
    (state, segment) => {
      if (!state.exists || state.value == null || typeof state.value !== "object") {
        return { exists: false, value: undefined };
      }
      if (!(segment in state.value)) {
        return { exists: false, value: undefined };
      }
      return {
        exists: true,
        value: (state.value as Record<string, unknown>)[segment]
      };
    },
    { exists: true, value }
  );
}

export function getCapabilityValue(projectName: string, capabilityPath: string): unknown {
  const config = getE2EProductConfigFromProjectName(projectName);
  const result = readDotPath(config.capabilities, capabilityPath);
  if (!result.exists) {
    throw new E2EContractError(
      "E2E_CFG_001",
      `Capability path "${capabilityPath}" is not defined for project "${projectName}".`
    );
  }
  return result.value;
}

export function isCapabilityEnabled(
  projectName: string,
  capabilityPath: string
): boolean {
  return getCapabilityValue(projectName, capabilityPath) === true;
}

export function getCapabilitySkipReason(
  projectName: string,
  capabilityPath: string
): string {
  if (isCapabilityEnabled(projectName, capabilityPath)) {
    return `${capabilityPath} is enabled for ${projectName}`;
  }
  return `${capabilityPath} is disabled by product config for ${projectName}`;
}

export function requireCapability(
  projectName: string,
  capabilityPath: string
): true {
  if (!isCapabilityEnabled(projectName, capabilityPath)) {
    throw new E2EContractError(
      "E2E_CFG_002",
      `Capability path "${capabilityPath}" is disabled for project "${projectName}".`
    );
  }
  return true;
}

export function getCommandLabelOrThrow(
  projectName: string,
  commandKey: keyof ReturnType<typeof getE2EProductConfigFromProjectName>["commands"]
): string {
  const config = getE2EProductConfigFromProjectName(projectName);
  const label = config.commands[commandKey];
  if (!label) {
    throw new E2EContractError(
      "E2E_CFG_002",
      `Command contract "${String(commandKey)}" is not defined for project "${projectName}".`
    );
  }
  return label;
}
