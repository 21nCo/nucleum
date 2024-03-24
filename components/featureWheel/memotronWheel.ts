import type { FeatureWheelGroup } from "$lib/tidy/types/featureWheel.type";

export const memotronWheel: FeatureWheelGroup[] = [
  {
    label: "Capture",
    color: "#ae83d4",
    spokes: [
      { label: "Seamless capture", contemporaries: [], progress: 0.4 },
      {
        label: "Adv. audio capture",
        contemporaries: [],
        progress: 0.3,
        isNovel: true
      },
      { label: "Sketch capture", contemporaries: [], progress: 0 },
      { label: "Type capture", contemporaries: [] },
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
        progress: 0.3,
        isProminent: true
      }
    ]
  },
  {
    label: "Journal",
    color: "#4287f5",
    spokes: [
      { label: "Journal", contemporaries: [], progress: 0.4 },
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
      { label: "Clipping from web", contemporaries: [], progress: 0.5 },
      { label: "Clipping from mobile", contemporaries: [], progress: 0.1 },
      {
        label: "Advanced clipping",
        contemporaries: [],
        progress: 0.1,
        isNovel: true
      }
    ]
  },
  {
    label: "App",
    color: "",
    spokes: [
      { label: "Accessibility", contemporaries: [], progress: 0.5 },
      { label: "Offlinability", contemporaries: [], progress: 0.5 },
      { label: "Interoperability", contemporaries: [], progress: 0.1 },
      { label: "Openess", contemporaries: [], progress: 1 }
    ]
  },
  {
    label: "Organization",
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
        progress: 0.1,
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
            value: 0.2
          }
        ],
        progress: 0
      }
    ]
  },
  {
    label: "Organization views",
    color: "#c9409a",
    spokes: [
      { label: "Infinite grid", contemporaries: [], isNovel: true },
      {
        label: "Time & Space views",
        contemporaries: [],
        isNovel: true,
        progress: 0.3
      },
      { label: "Sub tree", contemporaries: [], progress: 0.2 },
      { label: "Graph traversal", contemporaries: [], progress: 0 },
      { label: "Mindmapping", contemporaries: [], progress: 0 }
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
      { label: "NL Search", contemporaries: [], isNovel: true, progress: 0 }
    ]
  }
];
