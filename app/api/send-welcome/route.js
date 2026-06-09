import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

function trialEmail({ vorname, firmenname, trialEnd }) {
  const endDatum = new Date(trialEnd).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">KanalPro</h1>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:14px;">Professionelle Kanal- und Rohrverwaltung</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">Willkommen bei KanalPro, ${vorname}! 🎉</h2>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
              Schön, dass Sie dabei sind${firmenname ? ` – wir freuen uns, <strong>${firmenname}</strong> als neuen Kunden begrüßen zu dürfen` : ''}.
              Ihr <strong>14-tägiger kostenloser Testzeitraum</strong> hat soeben begonnen.
            </p>

            <!-- Trial Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin:24px 0;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;color:#1d4ed8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Ihr Trial-Zeitraum</p>
                  <p style="margin:0;color:#1e3a8a;font-size:16px;font-weight:600;">Kostenlos bis ${endDatum}</p>
                  <p style="margin:8px 0 0;color:#3b82f6;font-size:13px;">Danach ohne Risiko kündbar — kein Abo endet automatisch.</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
              Mit KanalPro haben Sie Zugriff auf:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ['📋', 'Auftragsverwaltung', 'Aufträge anlegen, verwalten und verfolgen'],
                ['👥', 'Kundenverwaltung', 'Alle Kundendaten zentral an einem Ort'],
                ['🏗️', 'Digitaler Zwilling', 'Rohrlebenslauf & KI-Schadensprognose'],
                ['📄', 'Rechnungen', 'Rechnungen erstellen und verwalten'],
                ['📅', 'Einsatzplanung', 'Disposition und Tourenplanung'],
              ].map(([icon, title, desc]) => `
              <tr>
                <td style="padding:6px 0;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:32px;font-size:18px;vertical-align:top;">${icon}</td>
                      <td style="padding-left:8px;">
                        <strong style="color:#111827;font-size:14px;">${title}</strong>
                        <span style="color:#6b7280;font-size:14px;"> — ${desc}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`).join('')}
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr>
                <td align="center">
                  <a href="https://kanalpro.de/dashboard" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                    Zum Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
              Fragen? Antworten Sie einfach auf diese E-Mail — wir helfen gerne weiter.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:20px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              KanalPro · kanalpro.de<br>
              Sie erhalten diese E-Mail, weil Sie sich soeben registriert haben.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function direktEmail({ vorname, firmenname, plan }) {
  const planLabel = plan === 'pro' ? 'Pro' : 'Starter';
  const planPreis = plan === 'pro' ? '59 €' : '29 €';

  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">KanalPro</h1>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:14px;">Professionelle Kanal- und Rohrverwaltung</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">Willkommen bei KanalPro, ${vorname}! 🎉</h2>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
              ${firmenname ? `Herzlich willkommen, <strong>${firmenname}</strong>!` : 'Herzlich willkommen!'}
              Ihr <strong>${planLabel}-Abonnement</strong> (${planPreis}/Monat) ist sofort aktiv.
            </p>

            <!-- Plan Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:24px 0;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;color:#15803d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Aktives Abonnement</p>
                  <p style="margin:0;color:#14532d;font-size:16px;font-weight:600;">KanalPro ${planLabel} · ${planPreis}/Monat</p>
                  <p style="margin:8px 0 0;color:#16a34a;font-size:13px;">Jederzeit kündbar, keine Mindestlaufzeit.</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr>
                <td align="center">
                  <a href="https://kanalpro.de/dashboard" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                    Zum Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
              Fragen? Antworten Sie einfach auf diese E-Mail — wir helfen gerne weiter.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:20px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              KanalPro · kanalpro.de<br>
              Sie erhalten diese E-Mail, weil Sie sich soeben registriert haben.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request) {
  try {
    const { email, vorname, firmenname, typ, trialEnd, plan } = await request.json();

    if (!email || !vorname || !typ) {
      return NextResponse.json({ error: 'Fehlende Pflichtfelder' }, { status: 400 });
    }

    const isTrial = typ === 'trial';

    const { data, error } = await resend.emails.send({
      from: 'KanalPro <noreply@kanalpro.de>',
      to: email,
      subject: isTrial
        ? `Willkommen bei KanalPro – Ihr 14-tägiger Test beginnt jetzt`
        : `Willkommen bei KanalPro – Ihr Abonnement ist aktiv`,
      html: isTrial
        ? trialEmail({ vorname, firmenname, trialEnd })
        : direktEmail({ vorname, firmenname, plan }),
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('send-welcome error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
