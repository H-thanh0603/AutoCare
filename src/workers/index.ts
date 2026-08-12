import "./email-worker";
import connection from "../lib/queue/redis-connection";

console.log("🚀 Lập lịch Hàng Đợi (Queue Workers) đang chạy...");

const shutdown = async () => {
  console.log("Shutting down workers...");
  await connection.quit();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
