import { readable, writable } from "svelte/store";
import type { ITileItem } from "../Landing.types";

export const currentProductsStore = readable<ITileItem[]>([
  {
    image: "pointron-product-image",
    title: "Pointron",
    description: "The one focus time tracker that you will ever need",
    href: "https://app.pointron.io"
  },
  {
    image: "pointron-product-image",
    title: "Memotron",
    description: "The kind of second brain that you are waiting for",
    href: "https://app.memotron.io"
  }
]);

export const upcomingProductsStore = writable<ITileItem[]>([
  {
    title: "Recloud",
    description: "Next generation cloud and authentication provider",
    href: "https:/app.gathery.io"
  },
  {
    title: "Selftron",
    description: "The best body-mind tracking and analytics ever built"
  },
  {
    title: "Longpress",
    description: "Next gen discovery platform powered by AI"
  },
  {
    title: "Biordic",
    description:
      "Digital repository of foods, inspired by periodic table arrangement"
  },
  {
    title: "Nearby maps",
    description: "The best way to find your friends and family"
  },
  {
    title: "Alt 100",
    description: "The best way to find your friends and family"
  }
]);

export const isProductsPanelOpen = writable<Boolean>(false);

export const isProductsPage = writable<Boolean>(false);
