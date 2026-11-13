/** A help center section as configured remotely in `appData.help`. */
export type HelpConfigSection = {
  section?: string;
  isInactive?: boolean;
  children?: string[];
};

/** A section the help center renders: an optional heading and its tiles. */
export type HelpSection = {
  heading?: string;
  items: string[];
};

export const TROUBLESHOOT_ACTION = "troubleshoot";
export const CHAT_ACTION = "chat";

/**
 * Resolves the help center sections. Troubleshoot is code-owned: it always
 * renders first, followed by Chat for subscribers, whether the remote config
 * is absent, empty or starts with an inactive section. Code-owned tiles are
 * merged into the first active section and removed from configured children,
 * so none of them appear twice.
 */
export function resolveHelpSections(
  config: HelpConfigSection[] | null | undefined,
  isChatAvailable: boolean
): HelpSection[] {
  const codeOwned = isChatAvailable
    ? [TROUBLESHOOT_ACTION, CHAT_ACTION]
    : [TROUBLESHOOT_ACTION];
  const sections: HelpSection[] = (Array.isArray(config) ? config : [])
    .filter((section) => section && !section.isInactive)
    .map((section) => ({
      heading:
        section.section && section.section !== "main"
          ? section.section
          : undefined,
      items: (Array.isArray(section.children) ? section.children : []).filter(
        (item) => !codeOwned.includes(item)
      )
    }));
  const [first, ...rest] = sections;
  return [
    { heading: first?.heading, items: [...codeOwned, ...(first?.items ?? [])] },
    ...rest
  ];
}
