import { Queue } from "bullmq";
import connection from "./redis-connection";

export const EMAIL_QUEUE_NAME = "email-queue";

export interface AppointmentConfirmationPayload {
  customerName: string;
  garageName: string;
  appointmentDate: string;
  appointmentTime: string;
  vehicleInfo: string;
  serviceNotes: string;
}

/** Discriminated union so the worker can only render known, typed templates. */
export type EmailJobData = { to: string; subject: string } & (
  | {
      templateName: "APPOINTMENT_CONFIRMATION";
      payload: AppointmentConfirmationPayload;
    }
  | {
      /** NOT IMPLEMENTED yet — enqueuing this fails the job on purpose. */
      templateName: "QUOTATION_SENT";
      payload: Record<string, never>;
    }
);

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

// Helper function to add email jobs. The jobId doubles as an idempotency key:
// BullMQ ignores a duplicate jobId while the original is still active/completed,
// so retries or double-enqueues cannot send the same email twice.
export async function enqueueEmail(data: EmailJobData & { jobId?: string }) {
  return await emailQueue.add("send-email", data, {
    jobId: data.jobId ?? `email:${data.templateName}:${data.to}:${data.subject}`,
  });
}
