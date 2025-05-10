import type {
  ContemporaryDetail,
  FeatureWheelGroup
} from "$lib/client/types/featureWheel.type";
import { Contemporary } from "$lib/client/components/featureWheel/comparer.type";

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
            label: [
              Contemporary.Notion,
              Contemporary.Capacities,
              Contemporary.Heptabase,
              Contemporary.Tana,
              Contemporary.Anytype
            ],
            value: 0.5
          },
          {
            label: Contemporary.AppleNotes,
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
              Contemporary.Obsidian,
              Contemporary.Notion,
              Contemporary.Capacities,
              Contemporary.Heptabase,
              Contemporary.Roam,
              Contemporary.Tana,
              Contemporary.Anytype,
              Contemporary.Remnote
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
            label: Contemporary.Remnote,
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
            label: [Contemporary.Notion, Contemporary.Capacities],
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
            label: [Contemporary.Notion, Contemporary.Capacities],
            value: 0.7
          }
        ],
        progress: 0
      },
      {
        label: "Metadata",
        contemporaries: [
          {
            label: [Contemporary.Notion, Contemporary.Capacities],
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
            label: Contemporary.Remnote,
            value: 0.7
          },
          {
            label: Contemporary.Dynalist,
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
            label: [Contemporary.Remnote],
            value: 0.6
          },
          {
            label: [Contemporary.Notion],
            value: 0.3
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
            label: [
              Contemporary.Capacities,
              Contemporary.Heptabase,
              Contemporary.Tana,
              Contemporary.Anytype
            ],
            value: 0.7
          },
          {
            label: Contemporary.Notion,
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
              Contemporary.Obsidian,
              Contemporary.Notion,
              Contemporary.Capacities,
              Contemporary.Heptabase,
              Contemporary.Roam,
              Contemporary.Tana,
              Contemporary.Anytype,
              Contemporary.Remnote
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
            label: Contemporary.ClickupDocs,
            value: 0.4
          },
          {
            label: Contemporary.Gitbook,
            value: 0.6
          }
        ],
        progress: 0.15
      },
      {
        label: "Table",
        contemporaries: [
          {
            label: Contemporary.Notion,
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
            label: Contemporary.Ideaflow,
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
    label: Contemporary.Obsidian,
    url: "https://obsidian.md"
  },
  {
    label: Contemporary.Notion,
    url: "https://notion.so"
  },
  {
    label: Contemporary.Capacities,
    url: "https://capacities.app"
  },
  {
    label: Contemporary.Heptabase,
    url: "https://heptabase.com"
  },
  {
    label: Contemporary.Roam,
    url: "https://roamresearch.com"
  },
  {
    label: Contemporary.Tana,
    url: "https://tana.ai"
  },
  {
    label: Contemporary.Anytype,
    url: "https://anytype.io"
  },
  {
    label: Contemporary.Remnote,
    url: "https://remnote.io"
  },
  {
    label: Contemporary.Dynalist,
    url: "https://dynalist.io"
  },
  {
    label: Contemporary.Ideaflow,
    url: "https://ideaflow.io"
  }
];
