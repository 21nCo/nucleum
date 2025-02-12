export class BaseError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, public field?: string) {
    super(message, 400);
    this.field = field;
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = "Not authorized") {
    super(message, 403);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = "Not authenticated") {
    super(message, 401);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string) {
    super(message, 500);
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string) {
    super(message, 500);
  }
}
