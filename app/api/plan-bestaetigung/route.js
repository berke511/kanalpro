import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

function planEmail({ planName }) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>${planName} aktiviert — KanalPro</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:28px 40px;background:#1d4ed8;text-align:center;">
            <span style="display:inline-block;width:36px;height:36px;background:#fff;border-radius:8px;line-height:36px;font-size:18px;font-weight:900;color:#1d4ed8;">K</span>
            <span style="color:#fff;font-size:18px;font-weight:700;margin-left:8px;vertical-align:middle;">KanalPro</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="color:#111827;font-size:22px;margin:0 0 12px;">✅ ${planName} ist jetzt aktiv!</h1>
            <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Dein <strong>${planName}-Plan</strong> wurde erfolgreich aktiviert. Du kannst jetzt mit KanalPro arbeiten.
            </p>
            <table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;padding:16px;width:100%;margin:0 0 28px;box-sizing:border-box;">
              <tr><td>
                <p style="color:#166534;font-size:14px;margin:0;font-weight:600;">Plan: ${planName}</p>
                <p style="color:#166534;font-size:13px;margin:6px 0 0;">Upgrade jederzeit unter: kanalpro.de/dashboard/billing</p>
              </td></tr>
            </table>
            <a href="https://kanalpro.de/dashboard" style="display:inline-block;background:#1d4ed8;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Zum Dashboard →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">KanalPro · support@kanalpro.de</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req) {
  try {
    const { email, plan, planName } = await req.json();
    if (!email || !plan) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }
    await resend.emails.send({
      from: 'KanalPro <noreply@kanalpro.de>',
      to: email,
      subject: `${planName || plan} aktiviert — KanalPro`,
      html: planEmail({ planName: planName || plan }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Email Fehler:', err);
    return NextResponse.json({ error: 'Email konnte nicht gesendet werden' }, { status: 500 });
  }
}