import { PlanType, type IUserPlan } from "@nucleum/schema/account/subscription";
import type { UserInformation } from "@nucleum/client/runtime/account/account.type";
import { parse } from "@21n/shared-utils/json.utils";

/** Parses persisted account information after validating its identity. */
export function resolveStoredUserInformation(
  value: string | null
): UserInformation | undefined {
  if (!value) return undefined;
  try {
    const parsed = parse(value) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as { id?: unknown }).id !== "string" ||
      !(parsed as { id: string }).id
    ) {
      return undefined;
    }
    return parsed as UserInformation;
  } catch {
    return undefined;
  }
}

/** Parses a persisted account plan after validating its plan type. */
export function resolveStoredUserPlan(
  value: string | null
): IUserPlan | undefined {
  if (!value) return undefined;
  try {
    const parsed = parse(value) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Object.values(PlanType).includes(
        (parsed as { plan?: PlanType }).plan as PlanType
      )
    ) {
      return undefined;
    }
    return parsed as IUserPlan;
  } catch {
    return undefined;
  }
}
