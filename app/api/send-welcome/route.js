import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

function trialEmail({ vorname, firmenname, trialEnd }) {
  const endDatum = new Date(trialEnd).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Willkommen bei KanalPro</title>
</head>
<body style="margin:0;padding:0;background:#fdf8f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fdf8f3;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;">

        <!-- Logo -->
        <tr>
          <td style="padding:0 0 24px 0;" align="center">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:#1d4ed8;border-radius:12px;padding:12px 24px;">
                  <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Kanal<span style="color:#93c5fd;">Pro</span></span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

            <!-- Hero Banner -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:40px 40px 32px;">
                  <p style="margin:0 0 8px;color:#bfdbfe;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Herzlich Willkommen</p>
                  <h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;">
                    Schön, dass Sie dabei sind${vorname ? `,<br>${vorname}!` : '!'}
                  </h1>
                  ${firmenname ? `<p style="margin:0;color:#bfdbfe;font-size:15px;">für <strong style="color:#e0f2fe;">${firmenname}</strong></p>` : ''}
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding:32px 40px 0;">
                  <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
                    Ihr <strong>14-tägiger kostenloser Testzeitraum</strong> hat gerade begonnen.
                    Schauen Sie sich alles in Ruhe an — ohne Druck, ohne Kreditkarte.
                  </p>

                  <!-- Trial Date Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
                    <tr>
                      <td style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:16px 20px;">
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td style="font-size:22px;padding-right:12px;vertical-align:middle;">⏳</td>
                            <td>
                              <p style="margin:0 0 2px;color:#92400e;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Ihr Testzeitraum</p>
                              <p style="margin:0;color:#78350f;font-size:16px;font-weight:700;">Kostenlos bis ${endDatum}</p>
                              <p style="margin:4px 0 0;color:#b45309;font-size:13px;">Danach kündbar — kein Abo endet automatisch.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 16px;color:#374151;font-size:15px;font-weight:600;">Was Sie in Ihrem Test erkunden können:</p>
                </td>
              </tr>

              <!-- Features -->
              <tr>
                <td style="padding:0 40px 8px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    ${[
                      ['📋', 'Auftragsverwaltung', 'Aufträge anlegen, zuweisen und im Blick behalten'],
                      ['👥', 'Kundenverwaltung', 'Alle Kundendaten und Objekte an einem Ort'],
                      ['🏗️', 'Digitaler Zwilling', 'Rohrlebenslauf und KI-Schadensprognose'],
                      ['📄', 'Rechnungen', 'Professionelle Rechnungen auf Knopfdruck'],
                      ['📅', 'Einsatzplanung', 'Disposition und Tourenplanung für Ihr Team'],
                    ].map(([icon, title, desc]) => `
                    <tr>
                      <td style="padding:6px 0;">
                        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                          <tr>
                            <td style="width:36px;vertical-align:top;padding-top:2px;">
                              <span style="font-size:17px;">${icon}</span>
                            </td>
                            <td style="vertical-align:top;">
                              <span style="color:#111827;font-size:14px;font-weight:600;">${title}</span>
                              <span style="color:#6b7280;font-size:14px;"> — ${desc}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>`).join('')}
                  </table>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding:28px 40px 8px;" align="center">
                  <a href="https://kanalpro.de/dashboard"
                     style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.01em;">
                    Jetzt loslegen →
                  </a>
                </td>
              </tr>

              <!-- Personal Note -->
              <tr>
                <td style="padding:24px 40px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="background:#f8fafc;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px 20px;">
                        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
                          💬 <strong>Persönlicher Hinweis:</strong> Wenn Sie Fragen haben oder Hilfe beim Einstieg brauchen —
                          antworten Sie einfach auf diese Mail. Wir freuen uns über Ihr Feedback!
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0;" align="center">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
              KanalPro · <a href="https://kanalpro.de" style="color:#9ca3af;">kanalpro.de</a><br>
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
  const planEmoji = plan === 'pro' ? '🚀' : '⚡';
  const planFeatures = plan === 'pro'
    ? ['Unbegrenzte Aufträge & Kunden', 'KI-Schadensprognose & Digitaler Zwilling', 'Vollständige Einsatzplanung & Disposition', 'Rechnungen & Firmendaten-Verwaltung', 'Prioritäts-Support']
    : ['Bis zu 50 Aufträge & Kunden', 'Auftragsverwaltung & Rechnungen', 'Kundenverwaltung', 'E-Mail-Support'];

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Willkommen bei KanalPro</title>
</head>
<body style="margin:0;padding:0;background:#fdf8f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fdf8f3;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;">

        <!-- Logo -->
        <tr>
          <td style="padding:0 0 24px 0;" align="center">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:#1d4ed8;border-radius:12px;padding:12px 24px;">
                  <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Kanal<span style="color:#93c5fd;">Pro</span></span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

            <!-- Hero Banner -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:linear-gradient(135deg,#14532d 0%,#16a34a 100%);padding:40px 40px 32px;">
                  <p style="margin:0 0 8px;color:#bbf7d0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">${planEmoji} Abonnement aktiv</p>
                  <h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;">
                    Willkommen an Bord${vorname ? `,<br>${vorname}!` : '!'}
                  </h1>
                  ${firmenname ? `<p style="margin:0;color:#bbf7d0;font-size:15px;">für <strong style="color:#dcfce7;">${firmenname}</strong></p>` : ''}
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding:32px 40px 0;">
                  <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
                    Ihr <strong>KanalPro ${planLabel}-Abonnement</strong> ist sofort aktiv.
                    Alles steht bereit — fangen Sie einfach an, es macht wirklich Spaß.
                  </p>

                  <!-- Plan Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
                    <tr>
                      <td style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:16px 20px;">
                        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%">
                          <tr>
                            <td>
                              <p style="margin:0 0 2px;color:#15803d;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Aktives Abonnement</p>
                              <p style="margin:0;color:#14532d;font-size:18px;font-weight:700;">KanalPro ${planLabel}</p>
                            </td>
                            <td align="right" style="vertical-align:middle;">
                              <span style="background:#16a34a;color:#ffffff;font-size:14px;font-weight:700;padding:6px 14px;border-radius:20px;">${planPreis}/Monat</span>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:10px 0 0;color:#15803d;font-size:13px;">✓ Jederzeit kündbar &nbsp;·&nbsp; ✓ Keine Mindestlaufzeit &nbsp;·&nbsp; ✓ Sofort nutzbar</p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-weight:600;">Ihr ${planLabel}-Plan beinhaltet:</p>
                </td>
              </tr>

              <!-- Plan Features -->
              <tr>
                <td style="padding:0 40px 8px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    ${planFeatures.map(f => `
                    <tr>
                      <td style="padding:5px 0;">
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td style="width:24px;color:#16a34a;font-size:15px;font-weight:700;vertical-align:top;">✓</td>
                            <td style="color:#374151;font-size:14px;padding-left:6px;">${f}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>`).join('')}
                  </table>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding:28px 40px 8px;" align="center">
                  <a href="https://kanalpro.de/dashboard"
                     style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.01em;">
                    Zum Dashboard →
                  </a>
                </td>
              </tr>

              <!-- Personal Note -->
              <tr>
                <td style="padding:24px 40px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="background:#f8fafc;border-left:3px solid #16a34a;border-radius:0 8px 8px 0;padding:16px 20px;">
                        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
                          💬 <strong>Persönlicher Hinweis:</strong> Danke, dass Sie uns vertrauen!
                          Bei Fragen oder Wünschen — antworten Sie einfach direkt auf diese Mail.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0;" align="center">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
              KanalPro · <a href="https://kanalpro.de" style="color:#9ca3af;">kanalpro.de</a><br>
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
      from: 'KanalPro <info@kanalpro.de>',
      to: email,
      subject: isTrial
        ? `Willkommen bei KanalPro – Ihr 14-tägiger Test beginnt jetzt 🎉`
        : `Willkommen bei KanalPro – Ihr ${plan === 'pro' ? 'Pro' : 'Starter'}-Abonnement ist aktiv 🚀`,
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
