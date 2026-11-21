import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  void _next;
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json({ error: { code: "MALFORMED_JSON", message: "Request body must contain valid JSON." } });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed.", details: error.flatten() },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2034") {
      res.status(409).json({
        error: { code: "CONFLICT_RETRY", message: "The change conflicted with another update. Please try again." },
      });
      return;
    }
    if (error.code === "P2002") {
      const target = error.meta?.target;
      const duplicateEmail = Array.isArray(target)
        ? target.includes("email")
        : typeof target === "string" && target.includes("email");
      res.status(409).json({
        error: {
          code: "CONFLICT",
          message: duplicateEmail ? "An account with this email already exists." : "This assignment already exists.",
        },
      });
      return;
    }
    if (error.code === "P2003" || error.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "The requested record was not found." } });
      return;
    }
  }

  console.error("Unhandled request error:", error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
};
