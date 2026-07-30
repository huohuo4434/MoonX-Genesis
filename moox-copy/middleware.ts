import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminOnlyPublicPath } from "@/lib/auth/admin-only-routes";
import { isAdminEmail } from "@/lib/auth/admin-emails";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const noStoreHeaders = { "Cache-Control": "no-store, max-age=0", Vary: "Cookie" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  // Always block internal research surfaces unless the session is an admin.
  if (isAdminOnlyPublicPath(pathname)) {
    if (!url || !anonKey) {
      return NextResponse.rewrite(new URL("/not-found", request.url), {
        headers: { ...noStoreHeaders, "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    let isAdmin = false;
    let response = NextResponse.next({ request });
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
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
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email?.trim().toLowerCase() ?? "";
    isAdmin = Boolean(email && isAdminEmail(email));
    if (!isAdmin) {
      // Standard 404 — never 403 that confirms the route exists.
      return NextResponse.rewrite(new URL("/not-found", request.url), {
        status: 404,
        headers: { ...noStoreHeaders, "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Vary", "Cookie");
    return response;
  }

  if (!url || !anonKey) {
    const res = NextResponse.next();
    Object.entries(noStoreHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
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
      },
    },
  });

  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Vary", "Cookie");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
