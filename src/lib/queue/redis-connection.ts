import IORedis from "ioredis";

// Reuse existing Redis instance if possible, or create a new one for BullMQ.
// It's recommended to have a dedicated connection for BullMQ.
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // BullMQ requirement
});

connection.on("error", (error) => {
  console.error("[BullMQ Redis] Connection Error:", error);
});

export default connection;
