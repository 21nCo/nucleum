import { parse } from "@21n/shared-utils/json.utils";

const serializationTypeKey = "__legacyIndexedDbType";

export async function serializeIndexedDbValue(
  value: unknown,
  seen = new WeakSet<object>()
): Promise<unknown> {
  if (value === undefined) {
    return { [serializationTypeKey]: "Undefined" };
  }
  if (value === null || typeof value !== "object") {
    if (typeof value === "bigint") {
      return {
        [serializationTypeKey]: "BigInt",
        value: value.toString()
      };
    }
    return value;
  }
  if (seen.has(value)) {
    return { [serializationTypeKey]: "CircularReference" };
  }
  if (value instanceof Date) {
    return {
      [serializationTypeKey]: "Date",
      value: value.toISOString()
    };
  }
  const constructorName = value.constructor?.name;
  if (constructorName === "RecordId") return String(value);
  if (constructorName === "Datetime") {
    return {
      [serializationTypeKey]: "Date",
      value: String(value)
    };
  }
  if (constructorName === "Duration") return String(value);
  if (typeof File !== "undefined" && value instanceof File) {
    return {
      [serializationTypeKey]: "File",
      name: value.name,
      lastModified: value.lastModified,
      type: value.type,
      size: value.size,
      dataBase64: arrayBufferToBase64(await value.arrayBuffer())
    };
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return {
      [serializationTypeKey]: "Blob",
      type: value.type,
      size: value.size,
      dataBase64: arrayBufferToBase64(await value.arrayBuffer())
    };
  }
  if (value instanceof ArrayBuffer) {
    return {
      [serializationTypeKey]: "ArrayBuffer",
      dataBase64: arrayBufferToBase64(value)
    };
  }
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    return {
      [serializationTypeKey]: value.constructor.name,
      dataBase64: bytesToBase64(bytes)
    };
  }

  seen.add(value);
  if (Array.isArray(value)) {
    const result = await Promise.all(
      value.map((item) => serializeIndexedDbValue(item, seen))
    );
    seen.delete(value);
    return result;
  }
  if (value instanceof Map) {
    const entries = await Promise.all(
      Array.from(value.entries()).map(async ([key, item]) => [
        await serializeIndexedDbValue(key, seen),
        await serializeIndexedDbValue(item, seen)
      ])
    );
    seen.delete(value);
    return {
      [serializationTypeKey]: "Map",
      entries
    };
  }
  if (value instanceof Set) {
    const values = await Promise.all(
      Array.from(value.values()).map((item) =>
        serializeIndexedDbValue(item, seen)
      )
    );
    seen.delete(value);
    return {
      [serializationTypeKey]: "Set",
      values
    };
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = await serializeIndexedDbValue(item, seen);
  }
  seen.delete(value);
  return result;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return bytesToBase64(new Uint8Array(buffer));
}

function bytesToBase64(bytes: Uint8Array) {
  const chunkSize = 32768;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function normalizeLegacyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeLegacyValue(item))
      .filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return value;

  const marker = value[serializationTypeKey];
  if (typeof marker === "string") {
    return normalizeSerializedLegacyValue(marker, value);
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalizeLegacyValue(item);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }
  return result;
}

function normalizeSerializedLegacyValue(
  marker: string,
  value: Record<string, unknown>
) {
  if (marker === "Date") return value.value;
  if (marker === "BigInt") return value.value;
  if (marker === "Undefined" || marker === "CircularReference") {
    return undefined;
  }
  if (marker === "Map") return normalizeLegacyValue(value.entries);
  if (marker === "Set") return normalizeLegacyValue(value.values);
  if (
    marker === "ArrayBuffer" ||
    marker === "Uint8Array" ||
    marker === "Uint8ClampedArray" ||
    marker === "Int8Array" ||
    marker === "Uint16Array" ||
    marker === "Int16Array" ||
    marker === "Uint32Array" ||
    marker === "Int32Array" ||
    marker === "Float32Array" ||
    marker === "Float64Array" ||
    marker === "Blob" ||
    marker === "File"
  ) {
    return typeof value.dataBase64 === "string"
      ? base64ToBytes(value.dataBase64)
      : undefined;
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalizeLegacyValue(item);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }
  return result;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseStoredPlainObject(value: string | null) {
  if (!value) return undefined;
  try {
    const parsed = parse(value) as unknown;
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
