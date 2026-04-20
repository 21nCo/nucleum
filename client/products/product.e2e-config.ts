export interface IProductE2EResourceAvailability {
  collections: boolean;
  goals: boolean;
  nodes: boolean;
  sessions: boolean;
  tasks: boolean;
}

export interface IProductE2ECalendarViewConfig {
  day: boolean;
  month: boolean;
  year: boolean;
}

export interface IProductE2ECalendarLayoutConfig {
  bird: boolean;
  classic: boolean;
}

export interface IProductE2ECalendarRightPanelConfig {
  enabled: boolean;
  panels: {
    focus: boolean;
    logs: boolean;
    memory: boolean;
  };
}

export interface IProductE2EOverviewTabConfig {
  all: boolean;
  days: boolean;
  months: boolean;
  years: boolean;
}

export interface IProductE2ECapabilitiesConfig {
  ui: {
    pinnedResourceBrowser: boolean;
  };
  commands: {
    directGoalLibraryCommand: boolean;
    focus: boolean;
    manualTimeEntry: boolean;
  };
  calendar: {
    manualLogUiEntry: boolean;
    dateNavigation: boolean;
    layouts: IProductE2ECalendarLayoutConfig;
    views: IProductE2ECalendarViewConfig;
    rightPanel: IProductE2ECalendarRightPanelConfig;
    persistence: {
      activeView: boolean;
    };
  };
  overview: {
    focusAnalyticsDashboard: boolean;
    memoryPanelSwitch: boolean;
    tabs: IProductE2EOverviewTabConfig;
  };
  settings: {
    focusPanel: boolean;
    nodeSettingsPanel: boolean;
    sharedSidebarSmoke: boolean;
    sharedModeOfInteraction: boolean;
    sharedHotKeyMatrix: boolean;
    sharedShortcutCustomization: boolean;
    focusPipToggle: boolean;
    accessibilityPanel: boolean;
  };
  records: {
    collection: boolean;
    collectionTabs: boolean;
    collectionRename: boolean;
    goal: boolean;
    goalTabs: boolean;
    task: boolean;
    taskTabs: boolean;
    node: boolean;
    nodeTabs: boolean;
    session: boolean;
  };
}

export interface IProductE2EConfig {
  resources: IProductE2EResourceAvailability;
  capabilities: IProductE2ECapabilitiesConfig;
}

export const productE2EConfigs = {
  nucleus: {
    resources: {
      collections: true,
      goals: true,
      nodes: true,
      sessions: false,
      tasks: true
    },
    capabilities: {
      ui: {
        pinnedResourceBrowser: true
      },
      commands: {
        directGoalLibraryCommand: false,
        focus: true,
        manualTimeEntry: true
      },
      calendar: {
        manualLogUiEntry: true,
        dateNavigation: false,
        layouts: {
          bird: false,
          classic: true
        },
        views: {
          day: true,
          month: true,
          year: true
        },
        rightPanel: {
          enabled: true,
          panels: {
            focus: true,
            logs: true,
            memory: false
          }
        },
        persistence: {
          activeView: true
        }
      },
      overview: {
        focusAnalyticsDashboard: true,
        memoryPanelSwitch: true,
        tabs: {
          all: true,
          days: true,
          months: true,
          years: true
        }
      },
      settings: {
        focusPanel: true,
        nodeSettingsPanel: true,
        sharedSidebarSmoke: true,
        sharedModeOfInteraction: true,
        sharedHotKeyMatrix: true,
        sharedShortcutCustomization: true,
        focusPipToggle: true,
        accessibilityPanel: true
      },
      records: {
        collection: true,
        collectionTabs: false,
        collectionRename: false,
        goal: true,
        goalTabs: true,
        task: true,
        taskTabs: true,
        node: true,
        nodeTabs: true,
        session: false
      }
    }
  },
  memotron: {
    resources: {
      collections: true,
      goals: false,
      nodes: true,
      sessions: false,
      tasks: false
    },
    capabilities: {
      ui: {
        pinnedResourceBrowser: true
      },
      commands: {
        directGoalLibraryCommand: false,
        focus: false,
        manualTimeEntry: false
      },
      calendar: {
        manualLogUiEntry: false,
        dateNavigation: false,
        layouts: {
          bird: false,
          classic: true
        },
        views: {
          day: false,
          month: false,
          year: false
        },
        rightPanel: {
          enabled: false,
          panels: {
            focus: false,
            logs: false,
            memory: false
          }
        },
        persistence: {
          activeView: false
        }
      },
      overview: {
        focusAnalyticsDashboard: false,
        memoryPanelSwitch: false,
        tabs: {
          all: false,
          days: false,
          months: false,
          years: false
        }
      },
      settings: {
        focusPanel: false,
        nodeSettingsPanel: true,
        sharedSidebarSmoke: false,
        sharedModeOfInteraction: true,
        sharedHotKeyMatrix: false,
        sharedShortcutCustomization: true,
        focusPipToggle: false,
        accessibilityPanel: true
      },
      records: {
        collection: true,
        collectionTabs: false,
        collectionRename: false,
        goal: false,
        goalTabs: false,
        task: false,
        taskTabs: false,
        node: true,
        nodeTabs: true,
        session: false
      }
    }
  },
  pointron: {
    resources: {
      collections: true,
      goals: true,
      nodes: false,
      sessions: false,
      tasks: true
    },
    capabilities: {
      ui: {
        pinnedResourceBrowser: true
      },
      commands: {
        directGoalLibraryCommand: false,
        focus: true,
        manualTimeEntry: true
      },
      calendar: {
        manualLogUiEntry: true,
        dateNavigation: false,
        layouts: {
          bird: false,
          classic: true
        },
        views: {
          day: true,
          month: true,
          year: true
        },
        rightPanel: {
          enabled: true,
          panels: {
            focus: true,
            logs: true,
            memory: false
          }
        },
        persistence: {
          activeView: true
        }
      },
      overview: {
        focusAnalyticsDashboard: true,
        memoryPanelSwitch: false,
        tabs: {
          all: true,
          days: true,
          months: true,
          years: true
        }
      },
      settings: {
        focusPanel: true,
        nodeSettingsPanel: false,
        sharedSidebarSmoke: false,
        sharedModeOfInteraction: false,
        sharedHotKeyMatrix: false,
        sharedShortcutCustomization: false,
        focusPipToggle: true,
        accessibilityPanel: false
      },
      records: {
        collection: true,
        collectionTabs: false,
        collectionRename: false,
        goal: true,
        goalTabs: true,
        task: true,
        taskTabs: true,
        node: false,
        nodeTabs: false,
        session: false
      }
    }
  }
} as const satisfies Record<"nucleus" | "memotron" | "pointron", IProductE2EConfig>;
