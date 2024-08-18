import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import type { IHighlightStore } from "./highlight.type";


const seedHighlighters: IHighlightStore = {
  highlighters: [
    { id: "1", label: "Red", color: "#be8686" },
    { id: "2", label: "Orange", color: "#f6e05e" },
    { id: "3", label: "Yellow", color: "#88c0d0" },
    { id: "4", label: "Green", color: "#a3be8c" },
    { id: "5", label: "Cyan", color: "#d08770" },
  ]
};

class HighlightColorsStore extends KeyValueStore<IHighlightStore> {
  constructor() {
    super(Resource.highlight, seedHighlighters, {
      refreshOnAppear: true
    });
  }
}

export const highlightStore = new HighlightColorsStore();