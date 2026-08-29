import type { DatafnSeedTransport } from "../fixtures/datafn-seed";

export type SeededNode = {
  blockId: string;
  id: string;
  label: string;
};

export type SeedNodeOptions = {
  content?: string;
  label?: string;
  prefix?: string;
};

/** Seeds canonical nodular-markdown trees without exercising Capture UI. */
export class MemorySeed {
  constructor(private readonly transport: DatafnSeedTransport) {}

  /** Seeds one root node with an editable simple-text child block. */
  async node(options: SeedNodeOptions = {}) {
    const [node] = await this.nodes(1, options);
    return node;
  }

  /** Seeds multiple root markdown trees in one DataFn mutation batch. */
  async nodes(count: number, options: SeedNodeOptions = {}) {
    const nodes = Array.from({ length: count }, (_, index) => {
      const id = this.transport.createId("node");
      const blockId = this.transport.createId("node");
      const label =
        count === 1 && options.label
          ? options.label
          : this.transport.createLabel(
              `${options.prefix ?? "E2E node"}${count > 1 ? ` ${index + 1}` : ""}`
            );
      return { blockId, id, label };
    });
    await this.transport.mutate(
      "node",
      nodes.flatMap((node) => {
        const content = options.content ?? node.label;
        return [
          {
            operation: "insert" as const,
            id: node.id,
            record: {
              id: node.id,
              label: node.label,
              body: "",
              contentType: "NODULAR_MARKDOWN",
              mdChildOrder: [node.blockId],
              metaType: "",
              text: content
            }
          },
          {
            operation: "insert" as const,
            id: node.blockId,
            record: {
              id: node.blockId,
              label: "",
              body: content,
              contentType: "SIMPLE_TEXT",
              creationContext: node.id,
              mdChildOrder: [],
              mdParent: [node.id],
              metaType: "",
              parent: node.id,
              parentPath: node.id,
              text: ""
            }
          }
        ];
      })
    );
    return nodes;
  }
}
