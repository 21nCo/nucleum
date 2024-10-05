import { readable, writable } from "svelte/store";
import type { ITileItem } from "../Landing.types";

export const currentProductsStore = readable<ITileItem[]>([
  {
    image: "pointron-product-image",
    title: "Pointron",
    label: "The one focus time tracker that you will ever need",
    href: "https://app.pointron.io"
  },
  {
    image: "pointron-product-image",
    title: "Memotron",
    label: "The kind of second brain that you are waiting for",
    href: "https://app.memotron.io"
  }
]);

export const upcomingProductsStore = writable<ITileItem[]>([
  // {
  //   icon: "memotron",
  //   title: "Memotron",
  //   label: "Your Personal Second Brain for Smarter Thinking",
  //   description:
  //     "Memotron helps you capture and organize everything you need, so you can think less about remembering and more about doing"
  // },
  {
    icon: "",
    title: "Fyweb",
    label: "Connecting Minds, Empowering Intelligence",
    description:
      "In a world full of scattered information, harnessing collective intelligence is key. Fywed makes it effortless to connect and collaborate for smarter solutions"
  },
  {
    icon: "",
    title: "Dapian",
    label: "Your address on the internet",
    description:
      "Dapien offers a new way to showcase your identity and connect with others, giving you a unique address on the internet to share and discove"
  },
  {
    icon: "",
    title: "Gathery",
    label: "Bringing People Together One Group at a Time",
    description:
      "Gathery redefines how you meet people and form groups, making connections simpler and more meaningful"
  },
  {
    icon: "",
    title: "Longpress",
    label: "Discover the Future with AI Driven Insights",
    description:
      "Longpress is a next-gen discovery platform powered by AI, delivering smarter insights and opportunities with cutting-edge technology"
  },
  {
    icon: "",
    title: "Selftron",
    label: "The Ultimate Body-Mind Tracking Experience",
    description:
      "Selftron offers top-notch tracking and analytics for your body and mind, making it easier to understand and improve your wellness"
  },
  {
    icon: "",
    title: "Biordic",
    label: "The Periodic Table of Foods",
    description:
      "Biordic is your digital food repository, organized like a periodic table to help you explore and understand various foods with ease"
  }
]);

export const isProductsPanelOpen = writable<Boolean>(false);

export const isProductsPage = writable<Boolean>(false);
