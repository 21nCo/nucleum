import type { FeatureWheelGroup } from "$lib/tidy/types/featureWheel.type";

export const memotronWheel: FeatureWheelGroup[] = [
  {
    label: "Capture",
    color: "",
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
        label: "Markdown",
        contemporaries: [],
        progress: 0.3,
        isProminent: true
      },
      { label: "Outlining", contemporaries: [], progress: 0 }
    ]
  },
  {
    label: "Journal",
    color: "",
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
    label: "App",
    color: "",
    spokes: [{ label: "Seamless clipping", contemporaries: [], progress: 0.4 }]
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
      { label: "Types", contemporaries: [], progress: 0 },
      { label: "Backlining", contemporaries: [], progress: 0 }
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
      { label: "Graph traversal", contemporaries: [], progress: 0 },
      { label: "Sub tree", contemporaries: [], progress: 0.2 },
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
      { label: "Serendipity", contemporaries: [], progress: 0 },
      { label: "NL Search", contemporaries: [], isNovel: true, progress: 0 }
    ]
  }
];
