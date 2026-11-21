import { app } from "./app";
import { config } from "./conf/config";
import { prisma } from "./conf/database";

const server = app.listen(config.PORT, "0.0.0.0", () => {
  console.info(`Roster API listening on port ${config.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received; shutting down.`);
  server.close(async (error) => {
    if (error) {
      console.error("HTTP server shutdown failed:", error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
