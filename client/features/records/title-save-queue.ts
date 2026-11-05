/**
 * Ordered title saves and editing sessions of one resource, shared by every
 * title editor of it, so an editor that replaces another one, such as after a
 * split pane switch, queues behind the saves the earlier editor started and
 * ends the earlier editor's session.
 */
export type TitleSaveQueue = {
  /**
   * Queues a save of `next` after the earlier ones and returns it with its
   * position. When it is the latest save and fails, the title no longer counts
   * as submitted, so it is saved again.
   */
  submit(
    next: string,
    save: (label: string) => Promise<unknown>
  ): { save: Promise<unknown>; sequence: number };
  /** Whether the save at `sequence` is the last one submitted. */
  isLatest(sequence: number): boolean;
  /**
   * Title the saves leave behind: the last submitted one while saves are
   * queued, since the store shows an earlier one until they finish, and
   * `storedLabel` otherwise.
   */
  resolveLatestLabel(storedLabel: string): string | undefined;
  /** Current editing session, which `endSession` replaces. */
  readonly session: number;
  /** Ends the current editing session, when editing starts, stops or an editor is removed. */
  endSession(): void;
};

const queues = new Map<string, TitleSaveQueue>();

function createTitleSaveQueue(): TitleSaveQueue {
  let saves: Promise<unknown> = Promise.resolve();
  let queued = 0;
  let sequence = 0;
  let submitted: string | undefined;
  let session = 0;
  return {
    submit(next, save) {
      const position = ++sequence;
      submitted = next;
      queued += 1;
      const pending = saves.then(() => save(next));
      pending.catch(() => {
        if (position === sequence) submitted = undefined;
      });
      saves = pending
        .catch(() => undefined)
        .finally(() => {
          queued -= 1;
        });
      return { save: pending, sequence: position };
    },
    isLatest(position) {
      return position === sequence;
    },
    resolveLatestLabel(storedLabel) {
      return queued > 0 ? submitted : storedLabel;
    },
    get session() {
      return session;
    },
    endSession() {
      session += 1;
    }
  };
}

/** Returns the title save queue of a resource, shared by all its title editors. */
export function resolveTitleSaveQueue(resourceId: string) {
  let queue = queues.get(resourceId);
  if (!queue) {
    queue = createTitleSaveQueue();
    queues.set(resourceId, queue);
  }
  return queue;
}
