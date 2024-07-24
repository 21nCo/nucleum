import type {
  ContemporaryDetail,
  FeatureWheelGroup
} from "$lib/client/types/featureWheel.type";

export const memotronWheel: FeatureWheelGroup[] = [
  {
    label: "App",
    color: "",
    spokes: [
      { label: "Openess", contemporaries: [], progress: 1, isProminent: true },
      {
        label: "Intuitiveness",
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
        progress: 0.4
      },
      { label: "Accessibility", contemporaries: [], progress: 0.5 },
      { label: "Interoperability", contemporaries: [], progress: 0.1 },
      { label: "Offlinability", contemporaries: [], progress: 0.5 }
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
        label: "Pdf",
        contemporaries: [
          {
            label: "Remnote",
            value: 0.7
          }
        ],
        progress: 0.8
      },
      {
        label: "Audio",
        contemporaries: [],
        progress: 0.7
      },
      {
        label: "Advanced Md",
        contemporaries: [
          {
            label: ["Notion", "Capacities"],
            value: 0.7
          }
        ],
        isNovel: true,
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
    label: "Capture",
    color: "#ae83d4",
    spokes: [
      { label: "Seamless capture", contemporaries: [], progress: 0.4 },
      {
        label: "Type capture",
        contemporaries: [],
        isNovel: true,
        progress: 0.8
      },
      { label: "Camera capture", contemporaries: [], progress: 0 },
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
      },
      { label: "Sketch capture", contemporaries: [], progress: 0 },
      {
        label: "Adv. audio capture",
        contemporaries: [],
        progress: 0,
        isNovel: true
      }
    ]
  },
  {
    label: "Clipping",
    color: "#e66a97",
    spokes: [
      { label: "Clip from web", contemporaries: [], progress: 0.7 },
      { label: "Youtube clipping", contemporaries: [], progress: 0.7 },
      { label: "Clip from mobile", contemporaries: [], progress: 0.1 },
      {
        label: "Kindle highlights",
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
        progress: 0.8
      },
      {
        label: "Clip from desktop",
        contemporaries: [],
        progress: 0
      },
      { label: "Audible highlights", contemporaries: [], progress: 0 },
      { label: "Scribd highlights", contemporaries: [], progress: 0 },
      { label: "Spotify highlights", contemporaries: [], progress: 0 }
    ]
  },
  {
    label: "Curation",
    color: "#c94",
    spokes: [
      {
        label: "Nodularity",
        contemporaries: [],
        progress: 0.8,
        isNovel: true
      },
      {
        label: "Forelinking",
        contemporaries: [],
        progress: 0.7,
        isNovel: true
      },
      {
        label: "Typed",
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
        label: "Backlinking",
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
        progress: 0.7
      },
      {
        label: "Query",
        contemporaries: [],
        progress: 0
      },
      {
        label: "Flash cards",
        contemporaries: [],
        progress: 0
      }
    ]
  },
  {
    label: "Views",
    color: "#c9409a",
    spokes: [
      { label: "Board", contemporaries: [], progress: 0.6 },
      { label: "Bird", contemporaries: [], isNovel: true, progress: 0.1 },
      {
        label: "Combination",
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
        progress: 0.15
      },
      {
        label: "Table",
        contemporaries: [
          {
            label: "Notion",
            value: 0.7
          }
        ],
        progress: 0.15
      },
      {
        label: "Calendar",
        contemporaries: [],
        isNovel: true,
        progress: 0.3
      },
      {
        label: "Space",
        contemporaries: [],
        isNovel: true,
        progress: 0
      }
    ]
  },
  {
    label: "TACO",
    color: "#32a852",
    spokes: [
      { label: "NL Search", contemporaries: [], isNovel: true, progress: 0 },
      {
        label: "Forelink suggestions",
        contemporaries: [],
        isNovel: true,
        progress: 0
      },
      {
        label: "Voice interaction",
        contemporaries: [],
        isNovel: true,
        progress: 0
      },
      {
        label: "Auto summarizer",
        contemporaries: [],
        isNovel: true,
        progress: 0
      },
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
        label: "Text editing AI",
        contemporaries: [],
        progress: 0
      }
    ]
  },
  {
    label: "Journal",
    color: "#4287f5",
    spokes: [
      { label: "Calendar", contemporaries: [], progress: 0.4, isNovel: true },
      { label: "Rewind", contemporaries: [], progress: 0, isNovel: true },
      {
        label: "Time machine",
        contemporaries: [],
        progress: 0,
        isNovel: true
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
