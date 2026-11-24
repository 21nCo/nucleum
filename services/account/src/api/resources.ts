import { nucleumDatafnSchema } from '@nucleum/schema/datafn';
import type { InterfaceResourceContract } from '@nucleum/schema/interfaces';
import { validationProblem, type ApiFieldError } from './problem.js';

/** JSON Schema object as the OpenAPI documents carry it. */
export type JsonSchema = Record<string, unknown>;

/** Value shape of one exposed field, from its DataFn declaration. */
type FieldKind = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'json';

/** One exposed field of a resource. */
export interface ApiField {
  name: string;
  kind: FieldKind;
  required: boolean;
  nullable: boolean;
  /** Dates and capability timestamps, held as Unix epoch milliseconds. */
  epochMs: boolean;
  enum?: readonly string[];
}

interface DatafnFieldDeclaration {
  name: string;
  type: string;
  required?: boolean;
  nullable?: boolean;
  enum?: readonly string[];
}

/** Fields DataFn's capabilities add to every shareable resource. */
const CAPABILITY_FIELDS: Record<string, FieldKind> = {
  createdAt: 'integer',
  updatedAt: 'integer',
  trashedAt: 'integer',
  createdBy: 'string',
  updatedBy: 'string',
  trashedBy: 'string',
  isArchived: 'boolean',
  visibility: 'string'
};

const DATAFN_KINDS: Record<string, FieldKind> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'integer',
  array: 'array',
  object: 'object',
  json: 'json'
};

/** Resolves an exposed field's shape from the DataFn schema. */
export function resolveApiField(resource: string, name: string): ApiField {
  const declared = (nucleumDatafnSchema.resources
    .find((entry) => entry.name === resource)?.fields as readonly DatafnFieldDeclaration[] | undefined)
    ?.find((field) => field.name === name);
  if (declared) {
    const kind = DATAFN_KINDS[declared.type];
    if (!kind) throw new Error(`Unsupported DataFn field type ${declared.type} on ${resource}.${name}`);
    return {
      name,
      kind,
      required: declared.required === true,
      nullable: declared.nullable === true,
      epochMs: declared.type === 'date',
      ...(declared.enum ? { enum: declared.enum } : {})
    };
  }
  const capability = CAPABILITY_FIELDS[name];
  if (!capability) throw new Error(`Unknown field ${resource}.${name}`);
  return {
    name,
    kind: capability,
    required: false,
    nullable: false,
    epochMs: capability === 'integer'
  };
}

/** JSON Schema of one field's values. */
export function fieldSchema(field: ApiField): JsonSchema {
  const base: JsonSchema = field.kind === 'json' ? {} : { type: field.kind };
  if (field.epochMs) base.description = 'Unix epoch milliseconds.';
  if (field.enum) base.enum = [...field.enum];
  if (field.nullable && typeof base.type === 'string') base.type = [base.type, 'null'];
  return base;
}

/** The URL segment of a resource: kebab-case plural (`sessionLog` -> `session-logs`). */
export function resourceSegment(resource: string): string {
  const kebab = resource.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return kebab.endsWith('y') ? `${kebab.slice(0, -1)}ies` : `${kebab}s`;
}

/** PascalCase name of a resource, for operation ids and schema titles. */
export function resourceTitle(resource: string): string {
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

/** JSON Schema of a record as the API returns it. */
export function recordSchema(contract: InterfaceResourceContract): JsonSchema {
  return {
    title: resourceTitle(contract.resource),
    type: 'object',
    description: contract.description,
    required: ['id'],
    properties: Object.fromEntries(
      contract.fields.map((name) => [name, fieldSchema(resolveApiField(contract.resource, name))])
    )
  };
}

/**
 * JSON Schema of a create or update body. `resourceTypes` lists the
 * `resource` values an app-scoped create may use; it makes `resource` required.
 */
export function writeSchema(
  contract: InterfaceResourceContract,
  operation: 'create' | 'update',
  resourceTypes?: readonly string[] | null
): JsonSchema {
  const names = contract[operation] || [];
  const fields = names.map((name) => resolveApiField(contract.resource, name));
  const constrained = operation === 'create' && resourceTypes && names.includes('resource');
  const required = fields.filter((field) => field.required || (constrained && field.name === 'resource'))
    .map((field) => field.name);
  return {
    title: `${resourceTitle(contract.resource)}${operation === 'create' ? 'Create' : 'Update'}`,
    type: 'object',
    additionalProperties: false,
    ...(operation === 'update' ? { minProperties: 1 } : {}),
    ...(operation === 'create' ? { required } : {}),
    properties: Object.fromEntries(fields.map((field) => [
      field.name,
      constrained && field.name === 'resource'
        ? { ...fieldSchema(field), type: 'string', enum: [...resourceTypes] }
        : fieldSchema(field)
    ]))
  };
}

function valueMatches(field: ApiField, value: unknown): boolean {
  if (value === null) return field.nullable;
  switch (field.kind) {
    case 'string':
      return typeof value === 'string' && (!field.enum || field.enum.includes(value));
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return Number.isSafeInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value);
    default:
      return value !== undefined;
  }
}

/**
 * Checks a create or update body against the operation's writable fields and
 * returns it as a record, or throws a 422 listing every invalid member.
 */
export function validateWriteBody(
  contract: InterfaceResourceContract,
  operation: 'create' | 'update',
  body: unknown
): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationProblem([{ pointer: '', detail: 'The body must be a JSON object.' }]);
  }
  const allowed = new Map(
    (contract[operation] || []).map((name) => [name, resolveApiField(contract.resource, name)])
  );
  const errors: ApiFieldError[] = [];
  const record = body as Record<string, unknown>;
  for (const [name, value] of Object.entries(record)) {
    const field = allowed.get(name);
    if (!field) {
      errors.push({ pointer: `/${name}`, detail: `${name} cannot be written by ${operation}.` });
    } else if (!valueMatches(field, value)) {
      const shape = field.enum ? `one of ${field.enum.join(', ')}` : field.kind;
      errors.push({ pointer: `/${name}`, detail: `${name} must be ${field.nullable ? `${shape} or null` : shape}.` });
    }
  }
  if (operation === 'create') {
    for (const field of allowed.values()) {
      if (field.required && record[field.name] === undefined) {
        errors.push({ pointer: `/${field.name}`, detail: `${field.name} is required.` });
      }
    }
  } else if (Object.keys(record).length === 0) {
    errors.push({ pointer: '', detail: 'The body must set at least one field.' });
  }
  if (errors.length > 0) throw validationProblem(errors);
  return record;
}

/**
 * Parses a list filter's query parameter value into the field's type, or
 * returns `undefined` when the value does not fit it.
 */
export function parseFilterValue(field: ApiField, raw: string): unknown {
  if (field.kind === 'boolean') {
    return raw === 'true' ? true : raw === 'false' ? false : undefined;
  }
  if (field.kind === 'number' || field.kind === 'integer') {
    if (raw.trim() === '') return undefined;
    const value = Number(raw);
    return valueMatches(field, value) ? value : undefined;
  }
  if (field.kind === 'string') {
    return !field.enum || field.enum.includes(raw) ? raw : undefined;
  }
  return undefined;
}
