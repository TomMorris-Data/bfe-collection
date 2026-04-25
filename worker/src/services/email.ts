interface FarmRow {
  name: string;
  contact_name: string | null;
  email: string | null;
}

interface TokenRow {
  token: string;
  period_start: string;
  period_end: string;
}

function htmlBody(farm: FarmRow, token: TokenRow, url: string): string {
  const period = new Date(token.period_start).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;background:#F9FAFB;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#3D1A6B,#5B2C8D);padding:32px 32px 24px;color:white;">
      <div style="font-size:13px;opacity:0.7;margin-bottom:4px;">Belmont Farm &amp; Equine Vets</div>
      <h1 style="margin:0;font-size:22px;font-weight:700;">Farm Health Check-In</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 12px;font-size:15px;">Hi ${farm.contact_name ?? farm.name},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#4B5563;">
        Your fortnightly health check-in is ready for <strong>${period}</strong>. It takes 2–5 minutes.
      </p>
      <a href="${url}" style="display:inline-block;background:#5B2C8D;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        Open your check-in →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;">
        This link is unique to ${farm.name} and expires in 7 days. If you've already completed this check-in you can ignore this message.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendCheckinEmail(
  farm: FarmRow,
  token: TokenRow,
  url: string,
  resendApiKey: string,
): Promise<boolean> {
  if (!resendApiKey) {
    console.log(`[DEV] Would send email to ${farm.email}: ${url}`);
    return true;
  }
  if (!farm.email) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Belmont Farm & Equine Vets <noreply@bfe-vets.co.uk>",
      to: [farm.email],
      subject: `Farm health check-in ready — ${new Date(token.period_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      html: htmlBody(farm, token, url),
    }),
  });

  if (!res.ok) {
    console.error(`[EMAIL] Failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}
