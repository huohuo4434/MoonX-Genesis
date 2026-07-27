import { redirect } from "next/navigation";

/** Legacy route — canonical verification page is /verification. */
export default function ResearchVerificationRedirect() {
  redirect("/verification");
}
