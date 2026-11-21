import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";
import { DEFAULT_BUSINESS_TIME_ZONE, isValidTimeZone } from "../lib/dates";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  BUSINESS_TIME_ZONE: z.string().default(DEFAULT_BUSINESS_TIME_ZONE)
    .refine(isValidTimeZone, "BUSINESS_TIME_ZONE must be a supported IANA time zone"),
});

export const config = environmentSchema.parse(process.env);
