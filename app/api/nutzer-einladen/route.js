import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { PLANS } from '@/lib/plans';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);

const VALID_ROLES = ['administrator', 'disponent', 'buero', 'techniker', 'fahrer'];

export async function POST(req) {
  try {
    // Get access token from Authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Kein Token' }, { status: 401 });

    // Create user-scoped Supabase client so auth.uid() works in RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

    const { email, role, company_id } = await req.json();

    if (!email || !role || !company_id) {
      return NextResponse.json({ error: 'Fehlende Pflichtfelder' }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 });
    }

    // Verify requester is inhaber or administrator of this company
    const { data: myMember } = await supabase
      .from('company_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .single();

    if (!myMember || !['inhaber', 'administrator'].includes(myMember.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Only inhaber can assign administrator role
    if (role === 'administrator' && myMember.role !== 'inhaber') {
      return NextResponse.json({ error: 'Nur der Inhaber kann Administratoren einladen' }, { status: 403 });
    }

    // Check plan limit
    const { data: abo } = await supabase
      .from('abonnements')
      .select('plan')
      .eq('company_id', company_id)
      .single();

    const plan = abo?.plan || 'starter';

    if (plan === 'starter') {
      return NextResponse.json({
        error: 'Im Starter-Plan können keine weiteren Nutzer eingeladen werden. Bitte upgraden Sie Ihren Plan.',
      }, { status: 400 });
    }

    const limit = PLANS[plan]?.limits?.nutzer || 1;
    const { count } = await supabase
      .from('company_members')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (count >= limit) {
      return NextResponse.json({
        error: `Ihr ${PLANS[plan]?.name || plan}-Plan erlaubt maximal ${limit} Nutzer. Bitte upgraden Sie, um mehr Mitglieder einzuladen.`,
      }, { status: 400 });
    }

    // Check not already a member
    const { data: existingMember } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', company_id)
      .ilike('email', email)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: 'Diese Person ist bereits Teammitglied.' }, { status: 400 });
    }

    // Check no pending invitation
    const { data: pendingInv } = await supabase
      .from('einladungen')
      .select('id')
      .eq('company_id', company_id)
      .ilike('email', email)
      .eq('angenommen', false)
      .gt('laeuft_ab_am', new Date().toISOString())
      .maybeSingle();

    if (pendingInv) {
      return NextResponse.json({ error: 'Es gibt bereits eine ausstehende Einladung für diese E-Mail.' }, { status: 400 });
    }

    // Create invitation record
    const { data: invitation, error: invError } = await supabase
      .from('einladungen')
      .insert({
        company_id,
        email: email.toLowerCase().trim(),
        role,
        eingeladen_von: user.id,
      })
      .select('token')
      .single();

    if (invError) throw invError;

    // Get company name for the email
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single();

    const companyName = company?.name || 'KanalPro';
    const inviteUrl = `https://kanalpro.de/einladung/${invitation.token}`;

    // Send invitation email
    await resend.emails.send({
      from: 'KanalPro <noreply@kanalpro.de>',
      to: email,
      subject: `Einladung zum Team von ${companyName} — KanalPro`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:40px 20px">
          <div style="background:#1e40af;padding:24px;border-radius:16px 16px 0 0;text-align:center">
            <span style="color:#fff;font-size:22px;font-weight:700">🔧 KanalPro</span>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:32px">
            <h2 style="color:#111827;margin:0 0 12px;font-size:22px">Sie wurden eingeladen! 🎉</h2>
            <p style="color:#374151;margin:0 0 8px">Sie wurden eingeladen, dem Team von <strong>${companyName}</strong> auf KanalPro beizutreten.</p>
            <div style="margin:28px 0;text-align:center">
              <a href="${inviteUrl}"
                style="background:#1e40af;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">
                Einladung annehmen →
              </a>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:20px">
              <p style="color:#6b7280;font-size:13px;margin:0">
                Falls Sie noch kein Konto haben, registrieren Sie sich zuerst unter
                <a href="https://kanalpro.de/registrieren" style="color:#1e40af">kanalpro.de/registrieren</a>
                und klicken dann erneut auf den Einladungslink.
              </p>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin:0">Der Einladungslink ist 7 Tage gültig.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[nutzer-einladen]', err);
    return NextResponse.json({ error: 'Interner Fehler beim Einladen' }, { status: 500 });
  }
}
