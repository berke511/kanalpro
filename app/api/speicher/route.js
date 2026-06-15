export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPlan } from '@/lib/plans';

// GET /api/speicher — gibt aktuellen Speicherverbrauch + Limit zurück
// Authorization: Bearer <supabase-access-token>
export async function GET(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Auth-Token aus Header
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  // Plan & Limit laden
  const { data: abo } = await supabaseAdmin
    .from('abonnements')
    .select('plan')
    .eq('user_id', user.id)
    .single();

  const plan = getPlan(abo?.plan || 'starter');
  const limitMb = plan.limits.speicher_mb === Infinity ? null : plan.limits.speicher_mb;

  // Speicherverbrauch aus dokumente-Tabelle summieren
  let usedBytes = 0;
  const { data: docs, error: docsError } = await supabaseAdmin
    .from('dokumente')
    .select('groesse_bytes')
    .eq('user_id', user.id);

  if (!docsError && docs) {
    usedBytes = docs.reduce((sum, d) => sum + (d.groesse_bytes || 0), 0);
  }

  const usedMb = usedBytes / (1024 * 1024);
  const percent = limitMb ? Math.min(100, (usedMb / limitMb) * 100) : 0;

  // Warnung bei Überschreitung
  const isAtLimit = limitMb !== null && usedMb >= limitMb;
  const isNearLimit = limitMb !== null && percent >= 80;

  return NextResponse.json({
    usedBytes,
    usedMb: Math.round(usedMb * 100) / 100,
    limitMb,
    percent: Math.round(percent * 10) / 10,
    planId: abo?.plan || 'starter',
    planName: plan.name,
    isAtLimit,
    isNearLimit,
    isUnlimited: limitMb === null,
  });
}
