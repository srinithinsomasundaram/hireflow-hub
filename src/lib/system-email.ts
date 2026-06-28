import nodemailer from "nodemailer";
import { Resend } from "resend";

export async function sendSystemEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  // Priority 1: SMTP (smtp.resend.com or any configured SMTP server)
  const host = process.env.SYSTEM_SMTP_HOST;
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;

  if (host && user && pass) {
    const port = Number(process.env.SYSTEM_SMTP_PORT ?? "465");
    const from = process.env.SYSTEM_EMAIL_FROM ?? user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({ from, to, subject, html });
    return;
  }

  // Priority 2: Resend API (fallback if SMTP not configured)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.RESEND_FROM ?? "HireFlow <onboarding@resend.dev>";
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) console.error("[system-email] Resend error:", error);
    return;
  }

  console.warn("[system-email] No email provider configured (set SYSTEM_SMTP_* or RESEND_API_KEY)");
}
