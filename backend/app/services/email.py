"""
Email dispatch via Resend.
Falls back to a console print in development if RESEND_API_KEY is not set.
"""
import resend
from app.config import settings
from app.models.orm import Farm, CheckInToken
from app.services.magic_link import checkin_url


def _html_body(farm: Farm, token: CheckInToken, url: str) -> str:
    period = token.period_start.strftime("%d %b %Y")
    enterprises = ", ".join(e.replace("_", " ").title() for e in farm.enterprise_types)
    return f"""
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
             color:#1F2937;background:#F9FAFB;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:white;
              border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#3D1A6B,#5B2C8D);
                padding:32px 32px 24px;color:white;">
      <div style="font-size:13px;opacity:0.7;margin-bottom:4px;">Belmont Farm &amp; Equine Vets</div>
      <h1 style="margin:0;font-size:22px;font-weight:700;">Farm Health Check-In</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 12px;font-size:15px;">Hi {farm.contact_name or farm.name},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#4B5563;">
        Your fortnightly health check-in is ready for <strong>{period}</strong>.
        This covers <strong>{enterprises}</strong> and should take 2–5 minutes.
      </p>
      <a href="{url}"
         style="display:inline-block;background:#5B2C8D;color:white;
                padding:14px 28px;border-radius:8px;text-decoration:none;
                font-weight:600;font-size:15px;">
        Open your check-in →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;">
        This link is unique to {farm.name} and expires in {settings.token_expiry_days} days.
        If you've already completed this check-in you can ignore this message.
      </p>
    </div>
  </div>
</body>
</html>
"""


async def send_checkin_email(farm: Farm, token: CheckInToken) -> bool:
    url = checkin_url(token.token)

    if not settings.resend_api_key:
        print(f"[DEV] Would send email to {farm.email}: {url}")
        return True

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send({
            "from": f"{settings.from_name} <{settings.from_email}>",
            "to": [farm.email],
            "subject": f"Farm health check-in ready — {token.period_start.strftime('%d %b')}",
            "html": _html_body(farm, token, url),
        })
        return True
    except Exception as exc:
        print(f"[EMAIL] Failed to send to {farm.email}: {exc}")
        return False
