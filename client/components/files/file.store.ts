import { Resource } from "../resourceStores/resource.enum";
import { ResourceStore } from "../resourceStores/resource.store";
import type { IFile } from "./file.type";

class FileStore extends ResourceStore<IFile> {
  constructor() {
    super(Resource.file);
  }
}

export const fileStore = new FileStore();
