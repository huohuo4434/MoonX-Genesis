import { getPublicFooterColumns } from "@/lib/navigation-server";
import { Footer } from "./Footer";

export async function FooterShell() {
  const footerColumns = await getPublicFooterColumns();
  return <Footer footerColumns={footerColumns} />;
}
