import type { Identifier } from "./allowlist";

/**
 * OTP delivery (§3.2): email via Resend, SMS via Twilio, chosen by
 * identifier type. In development without provider credentials the code is
 * printed to the server console — never in production.
 */
export async function deliverOtp(id: Identifier, code: string): Promise<void> {
  if (id.kind === "email" && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.OTP_FROM_EMAIL ?? "Rehawi Estates <onboarding@resend.dev>",
      to: id.value,
      subject: `${code} is your Rehawi Estates code`,
      text: `Your Rehawi Estates sign-in code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this message.`,
    });
    return;
  }

  if (
    id.kind === "phone" &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  ) {
    const { default: twilio } = await import("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    await client.messages.create({
      to: id.value,
      from: process.env.TWILIO_FROM_NUMBER,
      body: `${code} is your Rehawi Estates sign-in code. Expires in 10 minutes.`,
    });
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[auth] DEV ONLY — OTP for ${id.value}: ${code}`);
    return;
  }

  throw new Error(
    `No delivery provider configured for ${id.kind} identifiers`,
  );
}
