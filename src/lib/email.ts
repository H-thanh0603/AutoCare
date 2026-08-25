import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const SEND_EMAIL_FROM = "AutoCare <noreply@autocare.vn>"; // Replace with your verified domain

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
}) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      // Fail loudly in production — a silently skipped email is worse than a
      // failed job that BullMQ surfaces and retries.
      throw new Error("RESEND_API_KEY chưa được cấu hình — không thể gửi email.");
    }
    console.warn("RESEND_API_KEY is not set. Email skipped (dev only).");
    return { success: true, dummy: true };
  }

  try {
    const data = await resend.emails.send({
      from: SEND_EMAIL_FROM,
      to,
      subject,
      react,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}
