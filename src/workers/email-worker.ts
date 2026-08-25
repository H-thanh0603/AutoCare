import { Worker } from "bullmq";
import connection from "../lib/queue/redis-connection";
import {
  EMAIL_QUEUE_NAME,
  type EmailJobData,
} from "../lib/queue/email-queue";
import { sendEmail } from "../lib/email";
import AppointmentConfirmationEmail from "../emails/appointment-confirmation";

export const emailWorker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job) => {
    const { to, subject, templateName, payload } = job.data as EmailJobData;
    console.log(`[Worker] Sending "${templateName}" email to ${to}`);

    switch (templateName) {
      case "APPOINTMENT_CONFIRMATION": {
        const result = await sendEmail({
          to,
          subject,
          react: AppointmentConfirmationEmail(payload),
        });
        if (!result.success) {
          throw new Error(
            `Resend delivery failed for job ${job.id}: ${
              result.error instanceof Error ? result.error.message : String(result.error)
            }`,
          );
        }
        break;
      }
      case "QUOTATION_SENT":
        // NOT IMPLEMENTED — no template exists yet. Fail loudly so the queue
        // surfaces it instead of silently pretending the email was sent.
        throw new Error(`Email template "${templateName}" is NOT IMPLEMENTED.`);
      default: {
        const unknown: never = templateName;
        throw new Error(`Unknown email template: ${String(unknown)}`);
      }
    }

    console.log(`[Worker] Email to ${to} sent successfully.`);
    return { status: "success", sentTo: to };
  },
  {
    connection,
    concurrency: 5,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} đã hoàn tất.`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} bị lỗi:`, err);
});
