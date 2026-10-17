import type { EmailParts } from "@nucleum/schema/account/profile.type";

/** Formats masked account email parts for presentation. */
export function frameEmailFromParts(parts: EmailParts) {
  return `${parts.firstFew}...${parts.lastFew ?? ""}@${parts.emailDomain}`;
}
