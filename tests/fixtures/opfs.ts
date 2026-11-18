/**
 * An in-memory origin private file system and Web Locks manager for tests of
 * code that keeps files on the device. Directories and file contents persist
 * for the lifetime of the root, so two module instances (two tabs, or a page
 * before and after a reload) that share the root see the same files.
 */

type FakeDir = {
  dirs: Map<string, FakeDir>;
  files: Map<string, Uint8Array>;
};

function notFound(name: string) {
  return new DOMException(`${name} was not found`, "NotFoundError");
}

/**
 * Copies a written chunk. An ArrayBuffer is recognised by its tag, as test
 * globals may mix ArrayBuffers of several realms.
 */
async function toBytes(chunk: unknown): Promise<Uint8Array> {
  if (typeof chunk === "string") return new TextEncoder().encode(chunk);
  if (chunk instanceof Uint8Array) return Uint8Array.from(chunk);
  if (Object.prototype.toString.call(chunk) === "[object ArrayBuffer]") {
    return new Uint8Array((chunk as ArrayBuffer).slice(0));
  }
  if (ArrayBuffer.isView(chunk)) {
    return new Uint8Array(
      chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength)
    );
  }
  if (chunk && typeof (chunk as Blob).arrayBuffer === "function") {
    return new Uint8Array(await (chunk as Blob).arrayBuffer());
  }
  throw new TypeError("Unsupported chunk");
}

function fileHandle(dir: FakeDir, name: string): FileSystemFileHandle {
  return {
    kind: "file",
    name,
    async getFile() {
      const bytes = dir.files.get(name);
      if (!bytes) throw notFound(name);
      const copy = Uint8Array.from(bytes);
      return {
        name,
        size: copy.byteLength,
        type: "",
        arrayBuffer: async () => copy.buffer,
        text: async () => new TextDecoder().decode(copy)
      } as unknown as File;
    },
    async createWritable() {
      const chunks: Uint8Array[] = [];
      return {
        async write(chunk: unknown) {
          chunks.push(await toBytes(chunk));
        },
        async close() {
          const size = chunks.reduce((total, part) => total + part.length, 0);
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const part of chunks) {
            bytes.set(part, offset);
            offset += part.length;
          }
          dir.files.set(name, bytes);
        }
      } as unknown as FileSystemWritableFileStream;
    }
  } as unknown as FileSystemFileHandle;
}

function dirHandle(dir: FakeDir, name: string): FileSystemDirectoryHandle {
  return {
    kind: "directory",
    name,
    async getDirectoryHandle(child: string, options?: { create?: boolean }) {
      let next = dir.dirs.get(child);
      if (!next) {
        if (!options?.create) throw notFound(child);
        next = { dirs: new Map(), files: new Map() };
        dir.dirs.set(child, next);
      }
      return dirHandle(next, child);
    },
    async getFileHandle(child: string, options?: { create?: boolean }) {
      if (!dir.files.has(child)) {
        if (!options?.create) throw notFound(child);
        dir.files.set(child, new Uint8Array());
      }
      return fileHandle(dir, child);
    },
    async removeEntry(child: string) {
      if (!dir.dirs.delete(child) && !dir.files.delete(child)) {
        throw notFound(child);
      }
    },
    async *keys() {
      yield* [...dir.dirs.keys(), ...dir.files.keys()];
    },
    async *values() {
      for (const child of dir.dirs.keys()) {
        yield { kind: "directory", name: child };
      }
      for (const child of dir.files.keys()) {
        yield { kind: "file", name: child };
      }
    }
  } as unknown as FileSystemDirectoryHandle;
}

/** An origin private file system root whose contents tests can inspect. */
export function createFakeOpfs() {
  const root: FakeDir = { dirs: new Map(), files: new Map() };
  return {
    getDirectory: async () => dirHandle(root, ""),
    /**
     * Empties every top-level directory in place, so handles code already
     * holds to them (as a FileFn OPFSStore keeps its root) stay attached.
     */
    clear() {
      root.files.clear();
      for (const dir of root.dirs.values()) {
        dir.dirs.clear();
        dir.files.clear();
      }
    },
    /** Names of the entries in a directory, by path from the root. */
    list(...path: string[]): string[] {
      let dir: FakeDir | undefined = root;
      for (const part of path) dir = dir?.dirs.get(part);
      return dir ? [...dir.dirs.keys(), ...dir.files.keys()] : [];
    },
    /** Bytes of a file, by path from the root. */
    read(...path: string[]): Uint8Array | undefined {
      const name = path.pop()!;
      let dir: FakeDir | undefined = root;
      for (const part of path) dir = dir?.dirs.get(part);
      return dir?.files.get(name);
    }
  };
}

/**
 * Exclusive Web Locks shared by every module instance that uses it: a
 * request waits until earlier holders of the name release it.
 */
export function createFakeLocks(): LockManager {
  const tails = new Map<string, Promise<unknown>>();
  return {
    request(
      name: string,
      optionsOrCallback: unknown,
      maybeCallback?: (lock: Lock | null) => unknown
    ) {
      const callback = (maybeCallback ?? optionsOrCallback) as (
        lock: Lock | null
      ) => unknown;
      const signal =
        typeof optionsOrCallback === "object"
          ? (optionsOrCallback as { signal?: AbortSignal }).signal
          : undefined;
      const previous = tails.get(name) ?? Promise.resolve();
      const result = previous.then(() => {
        signal?.throwIfAborted();
        return callback({ name, mode: "exclusive" } as Lock);
      });
      tails.set(
        name,
        result.catch(() => undefined)
      );
      return result;
    },
    query: async () => ({ held: [], pending: [] })
  } as unknown as LockManager;
}
