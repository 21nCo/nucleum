import type {
  ContemporaryDetail,
  FeatureWheelGroup
} from "$lib/client/types/featureWheel.type";

export const memotronWheel: FeatureWheelGroup[] = [
  {
    label: "Capture",
    color: "#ae83d4",
    spokes: [
      { label: "Seamless capture", contemporaries: [], progress: 0.4 },
      {
        label: "Adv. audio capture",
        contemporaries: [],
        progress: 0.4,
        isNovel: true
      },
      { label: "Sketch capture", contemporaries: [], progress: 0 },
      { label: "Type capture", contemporaries: [], progress: 0.8 },
      {
        label: "Outlining",
        contemporaries: [
          {
            label: "Remnote",
            value: 0.7
          },
          {
            label: "Dynalist",
            value: 0.5
          }
        ],
        progress: 0
      }
    ]
  },
  {
    label: "Content",
    color: "",
    spokes: [
      {
        label: "Markdown",
        contemporaries: [
          {
            label: [
              "Obsidian",
              "Notion",
              "Capacities",
              "Heptabase",
              "Roam",
              "Tana",
              "Anytype",
              "Remnote"
            ],
            value: 0.8
          }
        ],
        progress: 0.35,
        isProminent: true
      },
      {
        label: "Pdf annotator",
        contemporaries: [
          {
            label: "Remnote",
            value: 0.7
          }
        ],
        progress: 0.7
      },
      {
        label: "Adv. Markdown",
        contemporaries: [
          {
            label: ["Notion", "Capacities"],
            value: 0.7
          }
        ],
        progress: 0.3
      },
      {
        label: "Traces",
        contemporaries: [
          {
            label: ["Notion", "Capacities"],
            value: 0.7
          }
        ],
        progress: 0
      },
      {
        label: "Metadata",
        contemporaries: [
          {
            label: ["Notion", "Capacities"],
            value: 0.4
          }
        ],
        progress: 0
      }
    ]
  },
  {
    label: "Journal",
    color: "#4287f5",
    spokes: [
      {
        label: "Time machine",
        contemporaries: [],
        progress: 0,
        isNovel: true
      },
      { label: "Rewind", contemporaries: [], progress: 0, isNovel: true }
    ]
  },
  {
    label: "Clipping",
    color: "#e66a97",
    spokes: [
      { label: "Clip from web", contemporaries: [], progress: 0.5 },
      { label: "Clip from mobile", contemporaries: [], progress: 0.1 },
      {
        label: "Clip from desktop",
        contemporaries: [],
        progress: 0
      },
      {
        label: "Kindle highlights sync",
        contemporaries: [
          {
            label: ["Remnote"],
            value: 0.6
          },
          {
            label: ["Notion"],
            value: 0.5
          }
        ],
        progress: 0
      }
    ]
  },
  {
    label: "App",
    color: "",
    spokes: [
      {
        label: "Intuitiveness & Ease",
        contemporaries: [
          {
            label: ["Notion", "Capacities", "Heptabase", "Tana", "Anytype"],
            value: 0.5
          },
          {
            label: "Apple Notes",
            value: 0.7
          }
        ],
        progress: 0.1
      },
      { label: "Accessibility", contemporaries: [], progress: 0.5 },
      { label: "Offlinability", contemporaries: [], progress: 0.5 },
      { label: "Interoperability", contemporaries: [], progress: 0.1 },
      { label: "Openess", contemporaries: [], progress: 1 }
    ]
  },
  {
    label: "Curation",
    color: "#c94",
    spokes: [
      {
        label: "Nodularity",
        contemporaries: [],
        progress: 0.2,
        isNovel: true
      },
      {
        label: "Forelinking",
        contemporaries: [],
        progress: 0.6,
        isNovel: true
      },
      {
        label: "Types",
        contemporaries: [
          {
            label: ["Capacities", "Heptabase", "Tana", "Anytype"],
            value: 0.7
          },
          {
            label: "Notion",
            value: 0.5
          }
        ],
        progress: 0.5
      },
      {
        label: "Adv. filter query",
        contemporaries: [],
        progress: 0
      },
      {
        label: "Backlining",
        contemporaries: [
          {
            label: [
              "Obsidian",
              "Notion",
              "Capacities",
              "Heptabase",
              "Roam",
              "Tana",
              "Anytype",
              "Remnote"
            ],
            value: 0.8
          }
        ],
        progress: 0
      }
    ]
  },
  {
    label: "Curation views",
    color: "#c9409a",
    spokes: [
      { label: "Bird view", contemporaries: [], isNovel: true, progress: 0.1 },
      {
        label: "Sub tree",
        contemporaries: [
          {
            label: "Clickup docs",
            value: 0.4
          },
          {
            label: "Gitbook",
            value: 0.6
          }
        ],
        progress: 0.2
      },
      {
        label: "Adv. arrangements",
        contemporaries: [
          {
            label: "Notion",
            value: 0.7
          },
          {
            label: ["Heptabase", "Capacities"],
            value: 0.5
          }
        ],
        progress: 0
      },
      {
        label: "Power table",
        contemporaries: [
          {
            label: "Notion",
            value: 0.7
          }
        ],
        progress: 0.1
      },
      // { label: "Graph traversal", contemporaries: [], progress: 0 },
      {
        label: "Time & Space views",
        contemporaries: [],
        isNovel: true,
        progress: 0.3
      }
    ]
  },
  {
    label: "Cutting edge",
    color: "#32a852",
    spokes: [
      {
        label: "Voice interaction",
        contemporaries: [],
        isNovel: true,
        progress: 0
      },
      { label: "NL Search", contemporaries: [], isNovel: true, progress: 0 },
      {
        label: "Serendipity",
        contemporaries: [
          {
            label: "Ideaflow",
            value: 0.5
          }
        ],
        progress: 0
      },
      {
        label: "Auto summarizer",
        contemporaries: [],
        isNovel: true,
        progress: 0
      }
    ]
  }
];

export const contemporariesMasterList: ContemporaryDetail[] = [
  {
    label: "obsidian",
    url: "https://obsidian.md"
  },
  {
    label: "notion",
    url: "https://notion.so"
  },
  {
    label: "capacities",
    url: "https://capacities.app"
  },
  {
    label: "heptabase",
    url: "https://heptabase.com"
  },
  {
    label: "roam",
    url: "https://roamresearch.com"
  },
  {
    label: "tana",
    url: "https://tana.ai"
  },
  {
    label: "anytype",
    url: "https://anytype.io"
  },
  {
    label: "remnote",
    url: "https://remnote.io"
  },
  {
    label: "dynalist",
    url: "https://dynalist.io"
  },
  {
    label: "ideaflow",
    url: "https://ideaflow.io"
  }
];
