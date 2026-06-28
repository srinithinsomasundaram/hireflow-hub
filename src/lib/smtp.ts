import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: string;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
};

export async function sendSmtpEmail(
  config: SmtpConfig,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: Number(config.port) === 465,
    auth: { user: config.username, pass: config.password },
  });
  await transporter.sendMail({
    from: `"${config.from_name}" <${config.from_email}>`,
    to,
    subject,
    html,
  });
}
