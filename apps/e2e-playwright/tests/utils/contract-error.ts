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
