import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody, pdf_base64, filename, dokument_typ, dokument_id } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ success: false, error: 'Ungültige oder fehlende Empfängeradresse' }, { status: 400 });
    }
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return NextResponse.json({ success: false, error: 'Betreff fehlt' }, { status: 400 });
    }
    if (!pdf_base64 || typeof pdf_base64 !== 'string' || pdf_base64.trim() === '') {
      return NextResponse.json({ success: false, error: 'PDF fehlt oder ungültig' }, { status: 400 });
    }
    if (!filename || typeof filename !== 'string' || filename.trim() === '') {
      return NextResponse.json({ success: false, error: 'Dateiname fehlt' }, { status: 400 });
    }

    let pdfBuffer;
    try {
      pdfBuffer = Buffer.from(pdf_base64, 'base64');
      if (pdfBuffer.length === 0) {
        return NextResponse.json({ success: false, error: 'PDF ist leer' }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Ungültiges PDF (Base64-Dekodierung fehlgeschlagen)' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'KanalPro <info@kanalpro.de>',
      to: [to],
      subject: subject.trim(),
      html: emailBody || '',
      attachments: [
        {
          filename: filename.trim(),
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('[send-dokument] Resend-Fehler:', error);
      return NextResponse.json({ success: false, error: error.message || 'Versand fehlgeschlagen' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[send-dokument] Unerwarteter Fehler:', e);
    return NextResponse.json({ success: false, error: e.message || 'Interner Serverfehler' }, { status: 500 });
  }
}
