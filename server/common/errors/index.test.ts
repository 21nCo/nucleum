import { describe, expect, it } from "vitest";

import {
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  NotFoundError,
  ValidationError
} from "./index";

describe("error hierarchy", () => {
  it("provides field metadata for validation errors", () => {
    const error = new ValidationError("Invalid", "email");
    expect(error.statusCode).toBe(400);
    expect(error.field).toBe("email");
  });

  it("sets appropriate HTTP status codes", () => {
    expect(new AuthenticationError().statusCode).toBe(401);
    expect(new AuthorizationError().statusCode).toBe(403);
    expect(new DatabaseError("fail").statusCode).toBe(500);
    expect(new NotFoundError("Resource").statusCode).toBe(404);
  });
});
