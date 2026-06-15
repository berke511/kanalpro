export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// Stripe Price IDs — nach Account-Erstellung in .env.local setzen
const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

export async function POST(req) {
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { planId, userId, email } = await req.json();

    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      return NextResponse.json({ error: 'Ungültiger Plan oder Stripe nicht konfiguriert' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'sepa_debit'],
      customer_email: email,
      locale: 'de',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/upgrade/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/billing?cancelled=true`,
      metadata: { userId, planId },
      subscription_data: {
        metadata: { userId, planId },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout Fehler:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
