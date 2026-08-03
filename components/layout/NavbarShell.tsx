import { unstable_noStore as noStore } from "next/cache";
import { getPublicMoreNav, getPublicPrimaryNav } from "@/lib/navigation-server";
import { getFeatureFlags } from "@/lib/feature-flags";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { Navbar } from "./Navbar";

export async function NavbarShell() {
  noStore();
  const flags = getFeatureFlags();
  const [primaryNav, moreNav, access] = await Promise.all([
    getPublicPrimaryNav(),
    Promise.resolve(getPublicMoreNav()),
    getAccessUser(),
  ]);
  return <Navbar primaryNav={primaryNav} moreNav={moreNav} adminEnabled={flags.adminEnabled} publicSignupEnabled={flags.publicSignupEnabled} sessionEmail={access.email} sessionIsAdmin={access.isAdmin} />;
}
