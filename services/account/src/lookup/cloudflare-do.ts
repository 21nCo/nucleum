import type {
  AuthFnRegionLookupRecord,
  AuthFnRegionLookupStore,
} from '@authfn/core';

export interface CloudflareDurableObjectNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): CloudflareDurableObjectStub;
}

export interface CloudflareDurableObjectStub {
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

interface DurableObjectStateLike {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<boolean>;
  };
}

interface LookupRequest {
  operation: 'getByIdentifier' | 'putIfAbsent' | 'update' | 'deleteByIdentifier';
  identifier?: string;
  record?: AuthFnRegionLookupRecord;
}

interface LookupResponse<T> {
  ok: true;
  data: T;
}

interface LookupErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

class AuthFnCloudflareDoLookupStoreError extends Error {
  readonly operation: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(operation: string, message: string, options: {
    status?: number;
    retryable?: boolean;
    cause?: unknown;
  } = {}) {
    super(message, { cause: options.cause });
    this.name = 'AuthFnCloudflareDoLookupStoreError';
    this.operation = operation;
    this.status = options.status;
    this.retryable = options.retryable ?? isRetryableStatus(options.status);
  }
}

export function createAccountCloudflareLookupStore(
  namespace: CloudflareDurableObjectNamespace,
): AuthFnRegionLookupStore {
  const objectNamePrefix = `${process.env.AUTHFN_NAMESPACE ?? 'nucleus_account'}:`;

  async function call<T>(
    operation: LookupRequest['operation'],
    identifier: string,
    body: Omit<LookupRequest, 'operation' | 'identifier'> = {},
  ): Promise<T> {
    const objectName = await objectNameForIdentifier(identifier, objectNamePrefix);
    const stub = namespace.get(namespace.idFromName(objectName));

    let response: Response;
    try {
      response = await stub.fetch('https://authfn-region-lookup.local/lookup', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          identifier,
          ...body,
        } satisfies LookupRequest),
      });
    } catch (error) {
      throw new AuthFnCloudflareDoLookupStoreError(
        operation,
        `AuthFn Cloudflare DO lookup store failed during ${operation}`,
        { cause: error, retryable: true },
      );
    }

    const payload = await response.json().catch(() => null) as LookupResponse<T> | LookupErrorResponse | null;
    if (!response.ok || !payload || payload.ok !== true) {
      const message = payload && payload.ok === false
        ? payload.error.message
        : `AuthFn Cloudflare DO lookup store returned ${response.status}`;
      throw new AuthFnCloudflareDoLookupStoreError(operation, message, {
        status: response.status,
      });
    }

    return payload.data;
  }

  return {
    getByIdentifier(identifier) {
      return call<AuthFnRegionLookupRecord | null>('getByIdentifier', identifier);
    },

    putIfAbsent(record) {
      return call<{ inserted: boolean; existing?: AuthFnRegionLookupRecord }>(
        'putIfAbsent',
        record.identifier,
        { record },
      );
    },

    update(record) {
      return call<AuthFnRegionLookupRecord>('update', record.identifier, { record });
    },

    async deleteByIdentifier(identifier) {
      await call<null>('deleteByIdentifier', identifier);
    },
  };
}

export class AuthFnRegionLookupDurableObject {
  private readonly state: DurableObjectStateLike;

  constructor(state: DurableObjectStateLike) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return json({
        ok: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed',
        },
      } satisfies LookupErrorResponse, 405);
    }

    let body: LookupRequest;
    try {
      body = await request.json() as LookupRequest;
    } catch {
      return json({
        ok: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON body',
        },
      } satisfies LookupErrorResponse, 400);
    }

    try {
      return await this.handle(body);
    } catch (error) {
      return json({
        ok: false,
        error: {
          code: 'LOOKUP_STORE_ERROR',
          message: error instanceof Error ? error.message : 'Cloudflare lookup store failed',
        },
      } satisfies LookupErrorResponse, 500);
    }
  }

  private async handle(body: LookupRequest): Promise<Response> {
    switch (body.operation) {
      case 'getByIdentifier': {
        requireIdentifier(body.identifier);
        const existing = await this.state.storage.get<AuthFnRegionLookupRecord>('record');
        return json({
          ok: true,
          data: existing ?? null,
        } satisfies LookupResponse<AuthFnRegionLookupRecord | null>);
      }

      case 'putIfAbsent': {
        const record = requireRecord(body.record);
        const existing = await this.state.storage.get<AuthFnRegionLookupRecord>('record');
        if (existing) {
          return json({
            ok: true,
            data: {
              inserted: false,
              existing,
            },
          } satisfies LookupResponse<{ inserted: boolean; existing?: AuthFnRegionLookupRecord }>);
        }

        await this.state.storage.put('record', record);
        return json({
          ok: true,
          data: {
            inserted: true,
          },
        } satisfies LookupResponse<{ inserted: boolean }>);
      }

      case 'update': {
        const record = requireRecord(body.record);
        await this.state.storage.put('record', record);
        return json({
          ok: true,
          data: record,
        } satisfies LookupResponse<AuthFnRegionLookupRecord>);
      }

      case 'deleteByIdentifier': {
        requireIdentifier(body.identifier);
        await this.state.storage.delete('record');
        return json({
          ok: true,
          data: null,
        } satisfies LookupResponse<null>);
      }
    }
  }
}

async function objectNameForIdentifier(identifier: string, prefix = ''): Promise<string> {
  const data = new TextEncoder().encode(identifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}${hash}`;
}

function requireIdentifier(identifier: string | undefined): string {
  if (!identifier) {
    throw new Error('identifier is required');
  }
  return identifier;
}

function requireRecord(record: AuthFnRegionLookupRecord | undefined): AuthFnRegionLookupRecord {
  if (!record?.identifier || !record.regionId || !record.authority) {
    throw new Error('lookup record with identifier, regionId, and authority is required');
  }
  return record;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function isRetryableStatus(status: number | undefined): boolean {
  return status === undefined || status === 408 || status === 429 || status >= 500;
}
