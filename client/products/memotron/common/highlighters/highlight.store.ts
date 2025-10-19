import { KeyValueStore } from "@21n/components/flux/resourceStores/kv.store";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import type { IHighlightStore } from "@21n/products/memotron/common/highlighters/highlight.type";

const seedHighlighters: IHighlightStore = {
  highlighters: [
    { id: "1", label: "Red", color: "#be8686" },
    { id: "2", label: "Orange", color: "#f6e05e" },
    { id: "3", label: "Yellow", color: "#88c0d0" },
    { id: "4", label: "Green", color: "#a3be8c" },
    { id: "5", label: "Cyan", color: "#d08770" }
  ]
};

class HighlightColorsStore extends KeyValueStore<IHighlightStore> {
  constructor() {
    super(Resource.highlight, seedHighlighters);
  }
  resolveColor(id: string) {
    return this.get().highlighters.find((x) => x.id === id)?.color ?? "#f6e05e";
  }
}
export const highlightStore = HighlightColorsStore.resolve(
  Resource.highlight
);
