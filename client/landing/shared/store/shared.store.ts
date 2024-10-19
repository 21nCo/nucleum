import { readable, writable } from "svelte/store";
import type { ITileItem } from "../Landing.types";

const staticUrl = import.meta.env.VITE_STATIC_URL;

export const currentProductsStore = readable<ITileItem[]>([
  {
    image: staticUrl + "/images/product/pointron-product-image.png",
    title: "Pointron",
    label: "The one focus app that you will ever need",
    href: "https://pointron.io"
  },
  {
    image: staticUrl + "/images/product/memotron-product-image.png",
    title: "Memotron",
    label: "Personal knowledge management redefined",
    href: "https://memotron.io"
  }
]);

export const utilityProductsStore = readable<ITileItem[]>([
  {
    image: staticUrl + "/images/product/ar-product-image.png",
    title: "Action Router",
    label: "Discover the best roadmap for any action",
    href: "https://actionrouter.com"
  },
  {
    image: staticUrl + "/images/product/depersonate-product-image.png",
    title: "Depersonate",
    label: "Kill digital impersonation with 1 click",
    href: "https://depersonate.com"
  }
]);

export const upcomingProductsStore = writable<ITileItem[]>([
  {
    icon: "",
    title: "Selftron",
    label: "The Ultimate partner for your body and mind.",
    description:
      "Selftron offers top-notch tracking and analytics for your body and mind, making it easier to understand and improve your wellness"
  },
  {
    icon: "nucleus",
    title: "Nucleus",
    label: "The next generation of software.",
    description: ""
  },
  {
    icon: "",
    title: "Longpress",
    label: "Next generation of search and discovery.",
    description:
      "Longpress is a next-gen search and discovery platform powered by AI"
  },
  {
    icon: "",
    title: "Fyweb",
    label: "Collective human intelligence for the 21st century.",
    description:
      "In a world full of scattered information, harnessing collective intelligence is key. Fywed makes it effortless to connect and collaborate for smarter solutions"
  },
  {
    icon: "",
    title: "Dapien",
    label: "Your new address on the internet",
    description:
      "Dapien offers a new way to showcase your identity and connect with others, giving you a unique address on the internet to share and discove"
  },

  {
    icon: "",
    title: "Gathery",
    label: "Transforming how we work together.",
    description:
      "Gathery redefines how you meet people and form groups, making connections simpler and more meaningful"
  }
]);

export const isProductsPanelOpen = writable<Boolean>(false);

export const isProductPage = writable<Boolean>(false);
