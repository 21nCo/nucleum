import { Resource } from "../flux/resourceStores/resource.enum";
import { ResourceStore } from "../flux/resourceStores/resource.store";
import type { IFile } from "./file.type";

class FileStore extends ResourceStore<IFile> {
  constructor() {
    super(Resource.file);
  }
}

export const fileStore = new FileStore();
