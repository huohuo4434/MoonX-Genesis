import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminOnlyPublicPath } from "@/lib/auth/admin-only-routes";
import { isAdminUser } from "@/lib/auth/is-admin";
import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, englishPath, isLocale, type Locale } from "@/lib/i18n/config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", Vary: "Cookie" };
const LOCALE_NEUTRAL_PREFIXES = ["/api", "/_next", "/admin"];

function isLocaleNeutral(pathname: string): boolean {
  return LOCALE_NEUTRAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function stripEnglishPrefix(pathname: string): string {
  if (pathname === "/en") return "/";
  return pathname.startsWith("/en/") ? pathname.slice(3) || "/" : pathname;
}

function copySecurityHeaders(response: NextResponse, privatePath = false) {
  if (privatePath) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Vary", "Cookie");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const originalPath = request.nextUrl.pathname;
  const englishUrl = originalPath === "/en" || originalPath.startsWith("/en/");
  const internalPath = stripEnglishPrefix(originalPath);

  // Admin and API surfaces are locale-neutral and never live under /en.
  if (englishUrl && isLocaleNeutral(internalPath)) {
    const target = request.nextUrl.clone();
    target.pathname = internalPath;
    return NextResponse.redirect(target, 307);
  }

  const cookieValue = request.cookies.get(LOCALE_COOKIE_KEY)?.value;
  const cookieLocale: Locale = cookieValue && isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

  // Once English is selected, old unprefixed internal links are normalized to /en.
  // This preserves locale after login, payment and legacy client-side redirects.
  if (
    !englishUrl &&
    cookieLocale === "en" &&
    !isLocaleNeutral(originalPath) &&
    request.method === "GET" &&
    (request.headers.get("accept") ?? "").includes("text/html")
  ) {
    const target = request.nextUrl.clone();
    target.pathname = englishPath(originalPath);
    return NextResponse.redirect(target, 307);
  }

  const locale: Locale = englishUrl ? "en" : isLocaleNeutral(originalPath) ? DEFAULT_LOCALE : cookieLocale;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-moox-locale", locale);
  requestHeaders.set("x-moox-original-path", originalPath);

  const makeResponse = () => {
    if (englishUrl) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = internalPath;
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  let response = makeResponse();
  response.cookies.set(LOCALE_COOKIE_KEY, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (isAdminOnlyPublicPath(internalPath)) {
    if (!url || !anonKey) {
      return NextResponse.rewrite(new URL("/not-found", request.url), {
        headers: { ...NO_STORE_HEADERS, "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = makeResponse();
          const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              path: options?.path ?? "/",
              sameSite: options?.sameSite ?? "lax",
              secure: isProd ? true : Boolean(options?.secure),
              httpOnly: options?.httpOnly ?? true,
            });
          });
          response.cookies.set(LOCALE_COOKIE_KEY, locale, { path: "/", maxAge: 31536000, sameSite: "lax", secure: isProd });
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    const isAdmin = isAdminUser({
      email: data.user?.email,
      role: typeof data.user?.app_metadata?.role === "string" ? data.user.app_metadata.role : null,
      isAdmin: data.user?.app_metadata?.isAdmin === true,
    });
    if (!isAdmin) {
      return NextResponse.rewrite(new URL("/not-found", request.url), {
        status: 404,
        headers: { ...NO_STORE_HEADERS, "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    return copySecurityHeaders(response, true);
  }

  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = makeResponse();
        const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            path: options?.path ?? "/",
            sameSite: options?.sameSite ?? "lax",
            secure: isProd ? true : Boolean(options?.secure),
            httpOnly: options?.httpOnly ?? true,
          });
        });
        response.cookies.set(LOCALE_COOKIE_KEY, locale, { path: "/", maxAge: 31536000, sameSite: "lax", secure: isProd });
      },
    },
  });

  await supabase.auth.getUser();
  const privatePath = ["/account", "/member", "/checkout"].some(
    (prefix) => internalPath === prefix || internalPath.startsWith(`${prefix}/`)
  );
  return copySecurityHeaders(response, privatePath);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
