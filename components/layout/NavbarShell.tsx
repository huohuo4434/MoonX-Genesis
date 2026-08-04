import { getPublicMoreNav, getPublicPrimaryNav } from "@/lib/navigation-server";
import { getFeatureFlags } from "@/lib/feature-flags";
import { Navbar } from "./Navbar";

/**
 * Public navigation shell.
 *
 * Authentication is intentionally resolved after hydration by NavbarSession,
 * so public page rendering never waits for Supabase Auth or membership APIs.
 */
export async function NavbarShell() {
  const flags = getFeatureFlags();
  const [primaryNav, moreNav] = await Promise.all([
    getPublicPrimaryNav(),
    Promise.resolve(getPublicMoreNav()),
  ]);

  return (
    <Navbar
      primaryNav={primaryNav}
      moreNav={moreNav}
      adminEnabled={flags.adminEnabled}
      publicSignupEnabled={flags.publicSignupEnabled}
    />
  );
}
