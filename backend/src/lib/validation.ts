import { z } from "zod";
import { dateOnlyInTimeZone, isValidDateOnly } from "./dates";

const dateOnly = z.string().refine(isValidDateOnly, "Date must be a real calendar date in YYYY-MM-DD format.");

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export const shiftSchema = z.object({
  memberId: z.string().min(1).max(64),
  date: dateOnly,
  notes: z.string().trim().max(500).optional().nullable(),
});

export function createShiftSchema(today = dateOnlyInTimeZone()) {
  return shiftSchema.refine((input) => input.date >= today, {
    path: ["date"],
    message: "A new shift cannot be scheduled in the past.",
  });
}
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).default(""),
  includePast: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

export const memberPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});
