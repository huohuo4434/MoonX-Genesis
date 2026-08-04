import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth/is-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ authenticated: false }, { headers: NO_STORE });
  }

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email) {
    return NextResponse.json({ authenticated: false }, { headers: NO_STORE });
  }

  const role = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null;
  const isAdmin = isAdminUser({
    email: user.email,
    role,
    isAdmin: user.app_metadata?.isAdmin === true || role === "admin",
  });

  return NextResponse.json(
    {
      authenticated: true,
      email: user.email.toLowerCase(),
      isAdmin,
    },
    { headers: NO_STORE }
  );
}
