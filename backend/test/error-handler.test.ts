import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/lib/errors";
import { errorHandler } from "../src/middleware/errors";

function invokeErrorHandler(error: unknown) {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  errorHandler(error, {} as Request, response as unknown as Response, vi.fn());
  return response;
}

describe("error handling", () => {
  it("maps Prisma transaction conflicts to a retryable conflict response", () => {
    const error = new Prisma.PrismaClientKnownRequestError("transaction conflict", {
      code: "P2034",
      clientVersion: Prisma.prismaVersion.client,
    });
    const response = invokeErrorHandler(error);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "CONFLICT_RETRY",
        message: "The change conflicted with another update. Please try again.",
      },
    });
  });

  it("serializes AppError status, code, message, and optional details", () => {
    const response = invokeErrorHandler(new AppError(400, "VALIDATION_ERROR", "Invalid input.", { field: "date" }));
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: "VALIDATION_ERROR", message: "Invalid input.", details: { field: "date" } },
    });
  });
});
