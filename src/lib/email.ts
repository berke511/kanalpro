// Einfacher Wrapper um die Resend-REST-API (https://resend.com) – bewusst
// ohne SDK-Abhängigkeit, ein einzelner fetch()-Aufruf genügt. Erwartet die
// Umgebungsvariable RESEND_API_KEY (Vercel-Projekteinstellungen); ohne
// gesetzten Key wird der Versand übersprungen und der Aufrufer bekommt das
// zurückgemeldet, damit er z. B. den Link trotzdem manuell anzeigen kann.
//
// Absenderadresse über EMAIL_FROM konfigurierbar. Solange in Resend keine
// eigene Domain verifiziert ist, funktioniert nur der Test-Absender
// "onboarding@resend.dev" (und auch dann nur an die eigene, im
// Resend-Konto hinterlegte E-Mail-Adresse) – nach Domain-Verifizierung
// z. B. auf "KanalPro <einladung@eure-domain.de>" umstellen.
const DEFAULT_FROM = "KanalPro <onboarding@resend.dev>";

export type SendEmailResult = { sent: true } | { sent: false; reason: string };

export async function sendInviteEmail(params: {
  to: string;
  companyName: string;
  roleLabel: string;
  inviteUrl: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY ist nicht konfiguriert." };
  }

  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const subject = `Einladung zu ${params.companyName} auf KanalPro`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
      <h2 style="margin-bottom: 4px;">Du wurdest eingeladen</h2>
      <p style="color: #4b5563; line-height: 1.5;">
        <strong>${escapeHtml(params.companyName)}</strong> nutzt KanalPro und lädt dich als
        <strong>${escapeHtml(params.roleLabel)}</strong> ein.
      </p>
      <p style="margin: 24px 0;">
        <a href="${params.inviteUrl}" style="background: #2f5fff; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          Einladung annehmen
        </a>
      </p>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br />
        <a href="${params.inviteUrl}" style="color: #2f5fff;">${params.inviteUrl}</a>
      </p>
    </div>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, reason: `Resend-Fehler (${res.status}): ${body.slice(0, 200)}` };
    }

    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : "Unbekannter Fehler beim E-Mail-Versand." };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
