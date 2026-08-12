import { Worker } from "bullmq";
import connection from "../lib/queue/redis-connection";
import { EMAIL_QUEUE_NAME } from "../lib/queue/email-queue";
// import { sendEmail } from "../lib/email";

export const emailWorker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job) => {
    const { to, subject, templateName, payload } = job.data;
    console.log(`[Worker] Bắt đầu xử lý Job gửi Email tới ${to}`);

    // Dựa vào templateName để render component tương ứng và gọi sendEmail()
    // Ví dụ: 
    // if (templateName === "APPOINTMENT_CONFIRMATION") { ... }
    
    // Giả lập xử lý tác vụ
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log(`[Worker] Gửi Email tới ${to} thành công!`);
    return { status: "success", sentTo: to };
  },
  {
    connection,
    concurrency: 5, // Xử lý đồng thời 5 email
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} đã hoàn tất.`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} bị lỗi:`, err);
});
