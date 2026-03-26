export interface E2EProductConfig {
  homePath: string;
  appMenuNavLabels: readonly string[];
  timelinePageLabel: string;
  pathByNavLabel: Record<string, string>;
  librarySectionLabel: string;
  includeHomeInNav?: boolean;
}

const e2eProductConfigs = {
  nucleus: {
    homePath: "calendar",
    appMenuNavLabels: ["Calendar", "Overview", "Library"] as const,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    },
    librarySectionLabel: "Nucleus",
    includeHomeInNav: false
  },
  memotron: {
    homePath: "calendar",
    appMenuNavLabels: ["Capture", "Calendar", "Overview", "Library"] as const,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Capture: "/capture",
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    },
    librarySectionLabel: "Memory"
  },
  pointron: {
    homePath: "calendar",
    appMenuNavLabels: ["Focus", "Calendar", "Overview", "Library"] as const,
    timelinePageLabel: "Calendar",
    pathByNavLabel: {
      Focus: "/focus",
      Calendar: "/calendar",
      Overview: "/overview",
      Library: "/library",
      Home: "/"
    },
    librarySectionLabel: "Focus"
  }
} satisfies Record<"nucleus" | "memotron" | "pointron", E2EProductConfig>;

export function getE2EProductConfig(
  product: keyof typeof e2eProductConfigs
): E2EProductConfig {
  return e2eProductConfigs[product];
}

export type NucleusAppMenuLabel =
  (typeof e2eProductConfigs)["nucleus"]["appMenuNavLabels"][number];
