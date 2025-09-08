import type { IHighlight } from "../landing.type";

export const highlights: { [key: string]: IHighlight } = {
  powerful: {
    icon: "ph:fire",
    title: "Unbelievably powerful",
    desc: "Unlock next-level of focus, time and goal tracking with a powerhouse of features.",
    visualRenderComponent: "pointronFeatures"
  },
  ainative: {
    icon: "brain",
    title: "AI native",
    desc: "We fundamentally designed the app to be AI native. Not the sprinkles or sparkles.",
    visualRenderComponent: "ainative",
    isVisualAtBottom: true
  },
  offline: {
    icon: "offline",
    title: "Full offline support",
    desc: "Signup as an offline-only user or go offline anytime as a cloud user.",
    isVisualAtBottom: true
  },
  zerotrust: {
    icon: "zerotrust",
    title: "Zero-trust security & ownership",
    desc: "To start with, the app is open source. If you opt for managed cloud sync, your data is end-to-end encrypted. Even better, you can use offline-only version.",
    visualRenderComponent: "security",
    isVisualAtBottom: true
  },
  wholesome: {
    icon: "powerfulwheel",
    title: "Thoughtful & wholesome",
    desc: "Finally, a place where everything feels complete",
    isJustifyEndOnCw: true
  },
  reliable: {
    icon: "ph:lightning",
    title: "Insanely reliable",
    desc: "Performance should never be an afterthought. Try finding an action that takes more than 1/2 a second. We will wait for you.",
    isVisualAtBottom: true
  },
  intuitive: {
    icon: "touch",
    title: "Surprisingly intuitive",
    desc: "Power doesn't always have to be intimidating. Give us a try.",
    isVisualAtBottom: true
  },
  humane: {
    icon: "ph:leaf",
    title: "Humane by design",
    desc: "No manipulative design, no dark patterns.",
    isVisualAtBottom: true,
    link: "https://humanebydesign.com"
  },
  laast: {
    icon: "infinity",
    title: "Built to last",
    desc: "No exits. No acquisitions. We're not building for an exit. We're building for you.",
    visualRenderComponent: "last"
  }
};
