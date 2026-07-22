import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// In-memory rate limit store (Edge Runtime, per-instance)
// Limit: 10 requests per 60 seconds per IP per auth path
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip, pathname) {
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return { limited: false };
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

// Auth routes subject to rate limiting
const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password']);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Rate limiting for auth pages
  if (AUTH_PATHS.has(pathname)) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const result = checkRateLimit(ip, pathname);
    if (result.limited) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'Content-Type': 'text/plain',
        },
      });
    }

    return NextResponse.next();
  }

  // Dashboard-v2 auth guard (server-side session validation)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(function ({ name, value }) {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(function ({ name, value, options }) {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() validates the token with Supabase Auth server (no JWT spoofing possible)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard-v2/:path*',
    '/login',
    '/register',
    '/forgot-password',
  ],
};
