import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Supabase Admin-Client (Service Role) für Server-seitige DB-Updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Signatur Fehler:', err.message);
    return NextResponse.json({ error: 'Webhook Fehler' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Zahlung erfolgreich — Plan aktivieren
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, planId } = session.metadata || {};
    if (userId && planId) {
      await supabaseAdmin
        .from('abonnements')
        .update({
          plan: planId,
          status: 'aktiv',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          aktualisiert_am: now,
        })
        .eq('user_id', userId);

      // Bestätigungs-Email
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user?.email) {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/plan-bestaetigung`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userData.user.email,
              plan: planId,
              planName: { pro: 'Pro', professional: 'Professional', enterprise: 'Enterprise' }[planId] || planId,
            }),
          });
        }
      } catch (e) {
        console.error('Email nach Zahlung Fehler:', e);
      }
    }
  }

  // Abo gekündigt — auf Starter zurücksetzen
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await supabaseAdmin
      .from('abonnements')
      .update({
        plan: 'starter',
        status: 'abgelaufen',
        stripe_subscription_id: null,
        aktualisiert_am: now,
      })
      .eq('stripe_subscription_id', sub.id);
  }

  // Zahlung fehlgeschlagen — Status setzen
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    await supabaseAdmin
      .from('abonnements')
      .update({ status: 'zahlung_fehlgeschlagen', aktualisiert_am: now })
      .eq('stripe_subscription_id', invoice.subscription);
  }

  return NextResponse.json({ received: true });
}
