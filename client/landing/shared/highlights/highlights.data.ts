import type { IHighlight } from "../landing.type";

export const highlights: { [key: string]: IHighlight } = {
  powerful: {
    icon: "powerfulwheel",
    title: "Unbelievably powerful",
    desc: "Unlock next-level of focus, time and goal tracking with a powerhouse of features.",
    visualRenderComponent: "pointronFeatures"
  },
  ainative: {
    icon: "brain",
    title: "AI native",
    desc: "Seamlessly integrate your data and harness cutting-edge AI with our custom MCP server",
    visualRenderComponent: "ainative",
    isVisualAtBottom: true
  },
  offline: {
    icon: "offline",
    title: "Offline version",
    desc: "No cloud required. If your OS runs, so does the app.",
    isVisualAtBottom: true
  },
  zerotrust: {
    icon: "zerotrust",
    title: "Zero-trust security & ownership",
    desc: "If you opt for managed cloud sync, your data is encrypted from start to finish - only you can access it. Even better, you can host your data on your preferred servers or run locally.",
    visualRenderComponent: "security",
    isVisualAtBottom: true
  },
  intuitive: {
    icon: "touch",
    title: "Surprisingly intuitive",
    desc: "Power doesn't always have to be intimidating. Give us a try.",
    isVisualAtBottom: true
  },
  laast: {
    icon: "infinity",
    title: "Built to last",
    desc: "No exits. No acquisitions. We're not building for an exit. We're building for you.",
    visualRenderComponent: "last"
  }
};
