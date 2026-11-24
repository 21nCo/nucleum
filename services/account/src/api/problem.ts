/**
 * RFC 9457 problem details for the versioned REST API. Every error carries
 * `type: "about:blank"`, the status text as `title`, a human-readable `detail`
 * and a stable machine-readable `code` extension member.
 */

const STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Content Too Large',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable'
};

/** Content type of every error response. */
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/** An error the API answers with a problem details response. */
export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
    readonly extensions: Record<string, unknown> = {},
    readonly headers: Record<string, string> = {}
  ) {
    super(detail);
    this.name = 'ApiProblem';
  }

  toResponse(): Response {
    return Response.json(
      {
        type: 'about:blank',
        title: STATUS_TITLES[this.status] ?? 'Error',
        status: this.status,
        detail: this.message,
        code: this.code,
        ...this.extensions
      },
      {
        status: this.status,
        headers: { 'content-type': PROBLEM_CONTENT_TYPE, ...this.headers }
      }
    );
  }
}

/** One invalid request member, listed under a validation problem's `errors`. */
export interface ApiFieldError {
  /** JSON Pointer to the member, or the query parameter name. */
  pointer: string;
  detail: string;
}

/** A 422 for a request body whose members fail validation. */
export function validationProblem(errors: ApiFieldError[]): ApiProblem {
  return new ApiProblem(422, 'validation_failed', 'The request body is invalid.', { errors });
}

/** A 400 for an invalid query parameter or header. */
export function parameterProblem(name: string, detail: string): ApiProblem {
  return new ApiProblem(400, 'invalid_parameter', detail, { parameter: name });
}

/** JSON Schema of a problem details body, for the OpenAPI documents. */
export const problemSchema = {
  title: 'Problem',
  type: 'object',
  description:
    'RFC 9457 problem details, served as application/problem+json. `code` is stable; `errors` lists invalid body members.',
  required: ['type', 'title', 'status', 'detail', 'code'],
  properties: {
    type: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'integer' },
    detail: { type: 'string' },
    code: { type: 'string' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        required: ['pointer', 'detail'],
        properties: { pointer: { type: 'string' }, detail: { type: 'string' } }
      }
    }
  }
} as const;
