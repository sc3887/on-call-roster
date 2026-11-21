import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { prisma } from "./conf/database";
import authRouter from "./routes/auth";
import rosterRouter from "./routes/roster";
import supportRouter from "./routes/support";
import { errorHandler, notFound } from "./middleware/errors";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

const healthCheck: express.RequestHandler = async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database query failed:", error);
    res.status(503).json({ status: "error", database: "disconnected" });
  }
};

app.get("/health", healthCheck);
app.get("/api/health", healthCheck);

app.use("/api/auth", authRouter);
app.use("/api/support", supportRouter);
app.use("/api", rosterRouter);
app.use(notFound);
app.use(errorHandler);
