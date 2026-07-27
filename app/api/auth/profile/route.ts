import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/membership";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    email: profile.email,
    role: profile.role,
    membershipStatus: profile.membership_status,
    membershipExpiresAt: profile.membership_expires_at,
  });
}
