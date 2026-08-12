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
    console.warn("RESEND_API_KEY is not set. Email not sent.");
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
