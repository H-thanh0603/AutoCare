import { Queue } from "bullmq";
import connection from "./redis-connection";

export const EMAIL_QUEUE_NAME = "email-queue";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Helper function to add email jobs
export async function enqueueEmail(data: {
  to: string;
  subject: string;
  templateName: "APPOINTMENT_CONFIRMATION" | "QUOTATION_SENT";
  payload: any;
}) {
  return await emailQueue.add("send-email", data);
}
