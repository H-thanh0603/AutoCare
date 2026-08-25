import "./email-worker";
import { emailWorker } from "./email-worker";
import connection from "../lib/queue/redis-connection";

console.log("🚀 Lập lịch Hàng Đợi (Queue Workers) đang chạy...");

const shutdown = async (signal: string) => {
  console.log(`Shutting down workers (${signal})...`);
  try {
    // Close the worker first: it finishes/drains in-flight jobs and releases
    // locks so BullMQ does not redeliver them as stalled after restart.
    await emailWorker.close();
  } catch (err) {
    console.error("Error while closing worker:", err);
  }
  await connection.quit();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
