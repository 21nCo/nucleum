import { getCapabilityFields, resolveCapabilities } from "@datafn/core";
import { describe, expect, it } from "vitest";
import { nucleumDatafnSchema } from "./datafn";
import { resolveProductTableNames } from "./features";
import {
  interfaceApps,
  interfaceContract,
  interfaceInternalResources,
  interfaceResources,
  isInterfaceOperationAllowed,
  resolveInterfaceResources,
  resolveInterfaceSharedFilter,
  resolveInterfaceVisibleTypes,
  type InterfaceExposedResource,
  type InterfaceResourceContract
} from "./interfaces";
import { Product } from "./product.type";

type SchemaField = {
  name: string;
  required?: boolean;
  readonly?: boolean;
  default?: unknown;
};

type SchemaResourceShape = {
  name: string;
  fields: readonly SchemaField[];
  capabilities?: Parameters<typeof resolveCapabilities>[1];
  defaultPermissions?: unknown;
  permissions?: unknown;
};

type SchemaRelationShape = {
  from: string | readonly string[];
  to: string | readonly string[];
  type: string;
  relation?: string;
  fkField?: string;
  pathField?: string;
  joinTable?: string;
  metadata?: readonly { name: string }[];
};

const schemaResources = new Map<string, SchemaResourceShape>(
  nucleumDatafnSchema.resources.map((resource) => [
    resource.name,
    resource as SchemaResourceShape
  ])
);
const schemaRelations =
  nucleumDatafnSchema.relations as readonly SchemaRelationShape[];

function schemaFields(name: string): Map<string, SchemaField> {
  const resource = schemaResources.get(name);
  if (!resource) throw new Error(`Unknown DataFn resource ${name}`);
  const fields = new Map<string, SchemaField>(
    resource.fields.map((field) => [field.name, field])
  );
  const capabilities = getCapabilityFields(
    resolveCapabilities(undefined, resource.capabilities)
  );
  for (const field of capabilities) fields.set(field.name, field as SchemaField);
  return fields;
}

function contractOf(name: InterfaceExposedResource): InterfaceResourceContract {
  return interfaceResources[name];
}

function writeLists(contract: InterfaceResourceContract) {
  return [contract.create, contract.update].filter(
    (fields): fields is readonly string[] => fields !== false
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Self relations whose rows keep an ancestor chain, read from the schema: an
 * htree `pathField`, or a `<fk>Path` or markdown `md<Fk>` sibling of a plain
 * self relation's foreign key.
 */
function schemaHierarchies(): { resource: string; parent: string; derived: string[] }[] {
  return schemaRelations
    .filter(
      (relation): relation is SchemaRelationShape & { from: string; fkField: string } =>
        typeof relation.from === "string" &&
        relation.from === relation.to &&
        typeof relation.fkField === "string"
    )
    .map((relation) => {
      const fields = schemaFields(relation.from);
      const candidates = [
        relation.pathField,
        `${relation.fkField}Path`,
        `md${capitalize(relation.fkField)}`
      ].filter((field): field is string => !!field && fields.has(field));
      return {
        resource: relation.from,
        parent: relation.fkField,
        derived: [...new Set(candidates)].sort()
      };
    })
    .filter((hierarchy) => hierarchy.derived.length > 0);
}

/** Fields a resource's derived-field rules forbid writing directly. */
function derivedOnlyFields(contract: InterfaceResourceContract): string[] {
  return (contract.derived ?? []).flatMap((rule) =>
    rule.kind === "hierarchy" ? [rule.parent, ...rule.derived] : [rule.completedAt]
  );
}

const exposedNames = Object.keys(interfaceResources) as InterfaceExposedResource[];
const internalNames = Object.keys(interfaceInternalResources);

describe("per-app interface contract", () => {
  it("exposes each app's product feature resources except the internal ones", () => {
    const expected = {
      memotron: Product.MEMOTRON,
      pointron: Product.POINTRON,
      nucleum: Product.NUCLEUM
    } as const;
    for (const app of interfaceApps) {
      const contract = interfaceContract[app];
      expect(contract.product).toBe(expected[app]);
      const productTables = resolveProductTableNames(contract.product);
      expect([...contract.resources].sort()).toEqual(
        productTables.filter((name) => !internalNames.includes(name)).sort()
      );
    }
    expect([...interfaceContract.memotron.resources].sort()).toEqual(
      ["collection", "file", "linkTag", "node", "property", "space", "view"]
    );
    expect([...interfaceContract.pointron.resources].sort()).toEqual([
      "collection",
      "event",
      "linkTag",
      "objective",
      "property",
      "session",
      "sessionLog",
      "space",
      "task",
      "view"
    ]);
  });

  it("accounts for every DataFn resource as exposed or internal, never both", () => {
    const all = nucleumDatafnSchema.resources.map((resource) => resource.name);
    for (const name of internalNames) {
      expect(all).toContain(name);
      expect(exposedNames).not.toContain(name);
    }
    expect([...exposedNames, ...internalNames].sort()).toEqual([...all].sort());
    expect([...interfaceContract.nucleum.resources].sort()).toEqual(
      [...exposedNames].sort()
    );
  });

  it("names app paths and scopes after the app", () => {
    for (const app of interfaceApps) {
      expect(interfaceContract[app]).toMatchObject({
        app,
        mcpPath: `/mcp/${app}`,
        restPath: `/v1/${app}`,
        scopes: { read: `${app}:read`, write: `${app}:write` }
      });
    }
  });

  it.each(exposedNames)(
    "declares only %s fields that exist in the DataFn schema",
    (name) => {
      const contract = contractOf(name);
      expect(contract.resource).toBe(name);
      const fields = schemaFields(name);
      const declared = [
        ...contract.fields,
        ...contract.filters,
        ...contract.sorts,
        ...writeLists(contract).flat(),
        ...derivedOnlyFields(contract),
        ...(contract.derived ?? []).flatMap((rule) =>
          rule.kind === "completion" ? [rule.checked] : []
        )
      ];
      expect(declared.filter((field) => !fields.has(field))).toEqual([]);
      expect(contract.fields).toContain("id");
      for (const list of [contract.fields, contract.filters, contract.sorts, ...writeLists(contract)]) {
        expect(new Set(list).size).toBe(list.length);
      }
      expect(contract.filters.filter((field) => !contract.fields.includes(field))).toEqual([]);
      expect(contract.sorts.filter((field) => !contract.fields.includes(field))).toEqual([]);
    }
  );

  it.each(exposedNames)(
    "exposes %s under DataFn's default read and write policy",
    (name) => {
      const resource = schemaResources.get(name);
      expect(resource?.defaultPermissions).not.toBe(false);
      expect(resource?.permissions).toBeUndefined();
      expect(nucleumDatafnSchema.defaultPermissions).toMatchObject({
        read: "allResourceFields",
        write: "allResourceFields"
      });
    }
  );

  it.each(exposedNames)("allows only writable %s fields to be written", (name) => {
    const contract = contractOf(name);
    const fields = schemaFields(name);
    for (const list of writeLists(contract)) {
      expect(list).not.toContain("id");
      expect(list.filter((field) => fields.get(field)?.readonly)).toEqual([]);
      expect(list.filter((field) => !contract.fields.includes(field))).toEqual([]);
    }
    if (contract.create !== false) {
      const required = [...fields.values()]
        .filter(
          (field) =>
            field.name !== "id" &&
            field.required &&
            field.default === undefined &&
            !field.readonly
        )
        .map((field) => field.name);
      const create = contract.create;
      expect(required.filter((field) => !create.includes(field))).toEqual([]);
    }
  });

  it("declares a read-only hierarchy rule for every self relation with an ancestor path", () => {
    const hierarchies = schemaHierarchies().filter((hierarchy) =>
      (exposedNames as readonly string[]).includes(hierarchy.resource)
    );
    expect(hierarchies.map((hierarchy) => hierarchy.resource).sort()).toEqual([
      "node",
      "objective"
    ]);
    for (const hierarchy of hierarchies) {
      const contract = contractOf(hierarchy.resource as InterfaceExposedResource);
      const rules = (contract.derived ?? []).filter((rule) => rule.kind === "hierarchy");
      expect(
        rules.map((rule) => ({ parent: rule.parent, derived: [...rule.derived].sort() }))
      ).toEqual([{ parent: hierarchy.parent, derived: hierarchy.derived }]);
      expect(contract.fields).toContain(hierarchy.parent);
      expect(contract.filters).toContain(hierarchy.parent);
    }
    const declared = exposedNames.filter((name) =>
      (contractOf(name).derived ?? []).some((rule) => rule.kind === "hierarchy")
    );
    expect(declared.sort()).toEqual(hierarchies.map((hierarchy) => hierarchy.resource).sort());
  });

  it("declares completion for every resource with a checked flag and a completion time", () => {
    const withCompletion = exposedNames.filter((name) => {
      const fields = schemaFields(name);
      return fields.has("isChecked") && fields.has("completedAtUnix");
    });
    expect(withCompletion).toEqual(["task"]);
    for (const name of withCompletion) {
      const contract = contractOf(name);
      expect(contract.derived?.filter((rule) => rule.kind === "completion")).toEqual([
        { kind: "completion", checked: "isChecked", completedAt: "completedAtUnix" }
      ]);
      expect(contract.create).toContain("isChecked");
      expect(contract.update).toContain("isChecked");
      expect(contract.fields).toContain("completedAtUnix");
    }
  });

  it.each(exposedNames)(
    "never writes a %s hierarchy parent, ancestor chain or derived time directly",
    (name) => {
      const contract = contractOf(name);
      const forbidden = derivedOnlyFields(contract);
      for (const list of writeLists(contract)) {
        expect(list.filter((field) => forbidden.includes(field))).toEqual([]);
      }
    }
  );

  it.each(exposedNames)(
    "writes only the Unix twin of a %s date that has one",
    (name) => {
      const fields = schemaFields(name);
      for (const list of writeLists(contractOf(name))) {
        expect(list.filter((field) => fields.has(`${field}Unix`))).toEqual([]);
      }
    }
  );

  it("never allows deletes, trash or bulk operations", () => {
    for (const app of interfaceApps) {
      for (const name of interfaceContract[app].resources) {
        for (const operation of ["delete", "trash", "restore", "bulkUpdate", "bulkCreate"]) {
          expect(isInterfaceOperationAllowed(app, name, operation)).toBe(false);
        }
        expect(isInterfaceOperationAllowed(app, name, "list")).toBe(true);
        expect(isInterfaceOperationAllowed(app, name, "get")).toBe(true);
        const contract = contractOf(name);
        expect(isInterfaceOperationAllowed(app, name, "create")).toBe(contract.create !== false);
        expect(isInterfaceOperationAllowed(app, name, "update")).toBe(contract.update !== false);
        expect(Object.keys(contract)).not.toContain("delete");
        expect(writeLists(contract).flat()).not.toContain("trashedAt");
      }
    }
  });

  it("refuses operations on resources the app does not expose", () => {
    expect(isInterfaceOperationAllowed("memotron", "objective", "list")).toBe(false);
    expect(isInterfaceOperationAllowed("memotron", "task", "create")).toBe(false);
    expect(isInterfaceOperationAllowed("pointron", "node", "get")).toBe(false);
    expect(isInterfaceOperationAllowed("pointron", "file", "list")).toBe(false);
    expect(isInterfaceOperationAllowed("nucleum", "accessLog", "list")).toBe(false);
    expect(isInterfaceOperationAllowed("nucleum", "vector", "get")).toBe(false);
    expect(isInterfaceOperationAllowed("nucleum", "capture", "create")).toBe(false);
    expect(isInterfaceOperationAllowed("nucleum", "node", "create")).toBe(true);
    expect(isInterfaceOperationAllowed("nucleum", "objective", "update")).toBe(true);
  });

  it("filters exactly the resources both scoped apps expose", () => {
    const memotron = new Set<string>(interfaceContract.memotron.resources);
    const shared = interfaceContract.pointron.resources.filter((name) => memotron.has(name));
    const filtered = exposedNames.filter((name) => contractOf(name).shared);
    expect([...filtered].sort()).toEqual([...shared].sort());
    expect(filtered.map((name) => [name, contractOf(name).shared?.kind])).toEqual([
      ["collection", "field"],
      ["property", "field"],
      ["view", "collections"],
      ["linkTag", "links"],
      ["space", "items"]
    ]);
  });

  it("filters collections and properties by a resource field the lists and creates must set", () => {
    for (const name of ["collection", "property"] as const) {
      const contract = contractOf(name);
      expect(contract.shared).toEqual({ kind: "field", field: "resource", paged: true });
      expect(schemaFields(name).has("resource")).toBe(true);
      expect(contract.fields).toContain("resource");
      expect(contract.filters).toContain("resource");
      expect(contract.create).toContain("resource");
      expect(contract.update).not.toContain("resource");
    }
  });

  it("filters views through their linked collections and keeps their lists unpaged", () => {
    const relation = schemaRelations.find(
      (entry) => entry.from === "collection" && entry.to === "view"
    );
    expect(relation).toMatchObject({ relation: "views", type: "many-many" });
    expect(contractOf("view").shared).toEqual({
      kind: "collections",
      relation: "views",
      paged: false
    });
    expect(schemaFields("collection").has("resource")).toBe(true);
  });

  it("filters link tags through the endpoints of the links that tag them", () => {
    const links = schemaRelations.find(
      (entry) => entry.joinTable === "record_links"
    );
    expect(links?.metadata?.map((field) => field.name)).toContain("tags");
    expect(contractOf("linkTag").shared).toEqual({
      kind: "links",
      joinTable: "record_links",
      metadata: "tags",
      paged: false
    });
  });

  it("filters space items by type and never filters, sorts or writes by them", () => {
    const contract = contractOf("space");
    expect(contract.shared).toEqual({ kind: "items", field: "items", paged: true });
    expect(schemaFields("space").get("items")).toMatchObject({ type: "array" });
    expect(contract.fields).toContain("items");
    expect(contract.filters).not.toContain("items");
    expect(contract.sorts).not.toContain("items");
    expect(writeLists(contract).flat()).not.toContain("items");
  });

  it("gives each scoped app its product's types and the nucleum app everything", () => {
    expect(resolveInterfaceVisibleTypes("nucleum")).toBe("all");
    const memotron = resolveInterfaceVisibleTypes("memotron");
    const pointron = resolveInterfaceVisibleTypes("pointron");
    expect(memotron).toEqual(resolveProductTableNames(Product.MEMOTRON));
    expect(pointron).toEqual(resolveProductTableNames(Product.POINTRON));
    expect(memotron).toContain("node");
    expect(memotron).not.toContain("objective");
    expect(pointron).toContain("objective");
    expect(pointron).not.toContain("node");
  });

  it("applies the shared filter to scoped apps only", () => {
    for (const name of interfaceContract.nucleum.resources) {
      expect(resolveInterfaceSharedFilter("nucleum", name)).toBeNull();
    }
    expect(resolveInterfaceSharedFilter("memotron", "node")).toBeNull();
    expect(resolveInterfaceSharedFilter("pointron", "task")).toBeNull();
    expect(resolveInterfaceSharedFilter("memotron", "collection")?.kind).toBe("field");
    expect(resolveInterfaceSharedFilter("pointron", "space")?.kind).toBe("items");
    expect(() => resolveInterfaceSharedFilter("memotron", "objective")).toThrow(
      "does not expose"
    );
    expect(() => resolveInterfaceSharedFilter("pointron", "node")).toThrow(
      "does not expose"
    );
  });

  it("resolves an app's resource contracts in declaration order", () => {
    for (const app of interfaceApps) {
      expect(resolveInterfaceResources(app).map((contract) => contract.resource)).toEqual(
        [...interfaceContract[app].resources]
      );
    }
  });
});
