import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { HttpError } from "./errors.js";
import {
  serializeHttpError,
  serializeInternalError,
  serializeValidationError,
} from "./api-error.dto.js";

describe("api error dto", () => {
  it("serializes http errors with the shared contract", () => {
    assert.deepEqual(
      serializeHttpError(HttpError.forbidden("Denied", "FORBIDDEN")),
      {
        error: "FORBIDDEN",
        message: "Denied",
      },
    );
  });

  it("serializes validation details", () => {
    const error = new ZodError([
      {
        code: "custom",
        path: ["body", "email"],
        message: "Invalid email",
      },
    ]);

    assert.deepEqual(serializeValidationError(error), {
      error: "VALIDATION_ERROR",
      details: [{ path: ["body", "email"], message: "Invalid email" }],
    });
  });

  it("keeps internal errors message-free for clients", () => {
    assert.deepEqual(serializeInternalError(), {
      error: "INTERNAL_SERVER_ERROR",
    });
  });
});
